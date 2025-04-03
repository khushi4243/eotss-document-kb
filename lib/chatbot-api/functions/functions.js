"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaFunctionStack = void 0;
const cdk = require("aws-cdk-lib");
const path = require("path");
// Import Lambda L2 construct
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const iam = require("aws-cdk-lib/aws-iam");
const s3 = require("aws-cdk-lib/aws-s3");
const step_functions_1 = require("./step-functions/step-functions");
class LambdaFunctionStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        const sessionAPIHandlerFunction = new lambda.Function(scope, 'SessionHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'session-handler')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "DDB_TABLE_NAME": props.sessionTable.tableName
            },
            timeout: cdk.Duration.seconds(30)
        });
        sessionAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.sessionTable.tableArn, props.sessionTable.tableArn + "/index/*"]
        }));
        this.sessionFunction = sessionAPIHandlerFunction;
        const systemPromptsAPIHandlerFunction = new lambda.Function(scope, 'SystemPromptsHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/system-prompt-handler')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "STAGED_SYSTEM_PROMPTS_TABLE": props.stagedSystemPromptsTable.tableName,
                "ACTIVE_SYSTEM_PROMPTS_TABLE": props.activeSystemPromptsTable.tableName,
                "DEFAULT_PROMPT": `You are a helpful AI chatbot that will answer questions based on your knowledge. 
        You have access to a search tool that you will use to look up answers to questions.`
            }
        });
        // Add permissions to the lambda function to read/write to the table
        systemPromptsAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.activeSystemPromptsTable.tableArn, props.activeSystemPromptsTable.tableArn + "/index/*", props.stagedSystemPromptsTable.tableArn, props.stagedSystemPromptsTable.tableArn + "/index/*"]
        }));
        this.systemPromptsFunction = systemPromptsAPIHandlerFunction;
        props.activeSystemPromptsTable.grantReadWriteData(systemPromptsAPIHandlerFunction);
        props.stagedSystemPromptsTable.grantReadWriteData(systemPromptsAPIHandlerFunction);
        // Define the Lambda function resource
        const websocketAPIFunction = new lambda.Function(scope, 'ChatHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-chat')),
            handler: 'index.handler',
            environment: {
                "WEBSOCKET_API_ENDPOINT": props.wsApiEndpoint.replace("wss", "https"),
                // "PROMPT" : `You are a helpful AI chatbot that will answer questions based on your knowledge. 
                // You have access to a search tool that you will use to look up answers to questions.`,
                'SESSION_HANDLER': sessionAPIHandlerFunction.functionName,
                'SYSTEM_PROMPTS_HANDLER': systemPromptsAPIHandlerFunction.functionName,
                'KB_ID': props.knowledgeBase.attrKnowledgeBaseId,
                'CONFL_PROMPT': `You are a knowledge expert looking to either identify conflicts among the 
            above documents or assure the user that no conflicts exist. You are not looking for small 
            syntatic or grammatical differences, but rather pointing out major factual inconsistencies. 
            You can be confident about identifying a conflict between two documents if the conflict 
            represents a major factual difference that would result in semantic differences between 
            responses constructed with each respective decoment. If conflicts are detected, please format 
            them in an organized list where each entry includes the names of the conflicting documents as 
            well as the conflicting statements. Use each document's actual name from the source uri in 
            this list.If there is no conflict please respond only with "no 
            conflicts detected" Do not include any additional information. Only include identified 
            conflicts that you are confident are factual inconsistencies. Do not include identified 
            conflicts that you are not confident are real conflicts. Do not report conflicts that are not 
            relevant to the user's query, which will be given below. Below is an example user query with 
            examples of a relevant conflict, an irrelevant conflict, and a non conflict: 
            <example_user_query> "Are state parks in Massachusetts open year-round, and are there any 
            costs associated with access for residents?" </example_user_query> Example of a Relevant 
            Conflict <conflict_example> Document A: "Massachusetts state parks are open year-round and 
            free for all residents." Document B: "Massachusetts state parks are closed during the winter 
            season." Conflict Reason: The statements directly conflict on whether parks remain open 
            year-round, which is relevant to the user’s query. inclusion: This conflict would be included 
            as a conflict for the given user query. It is a clear factual conflict, and it is relevant to 
            the example user query. </conflict_example> Example of a Non-Conflict <non_conflict_example> 
            Document A: "Massachusetts state parks offer seasonal programs." Document B: "Some parks may 
            require entrance fees for special events." Reason: These statements do not contradict each 
            other. inclusion: This would not be included as a conflict for the given user query. It is 
            not a factual conflict. </non_conflict_example> Example of an Irrelevant Conflict 
            <irrelevant_conflict_example> Document C: "Parks in western Massachusetts do not allow pets 
            on trails" Document D: "State parks in western Massachusetts allow pets on trails as long as 
            they are leashed." Reason: While these statements conflict on whether pets are allowed at 
            parks, niether statement is about year-round park access or costs to access parks, which is 
            the focus of the user’s query. inclusion: This would not be included as a conflict for the 
            given user query. Although it is a factual conflict, it is not relevant to the given user 
            query. </irrelevant_conflict_example>`
            },
            timeout: cdk.Duration.seconds(300)
        });
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel',
            ],
            resources: ["*"]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:Retrieve'
            ],
            resources: [props.knowledgeBase.attrKnowledgeBaseArn]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'lambda:InvokeFunction'
            ],
            resources: [this.sessionFunction.functionArn]
        }));
        this.chatFunction = websocketAPIFunction;
        const feedbackAPIHandlerFunction = new lambda.Function(scope, 'FeedbackHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'feedback-handler')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "FEEDBACK_TABLE": props.feedbackTable.tableName,
                "FEEDBACK_S3_DOWNLOAD": props.feedbackBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.feedbackTable.tableArn, props.feedbackTable.tableArn + "/index/*"]
        }));
        feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.feedbackBucket.bucketArn, props.feedbackBucket.bucketArn + "/*"]
        }));
        this.feedbackFunction = feedbackAPIHandlerFunction;
        const deleteS3APIHandlerFunction = new lambda.Function(scope, 'DeleteS3FilesHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/delete-s3')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        deleteS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.deleteS3Function = deleteS3APIHandlerFunction;
        const getS3KnowledgeAPIHandlerFunction = new lambda.Function(scope, 'GetS3KnowledgeFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/get-s3')),
            handler: 'index.handler',
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        getS3KnowledgeAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.getS3KnowledgeFunction = getS3KnowledgeAPIHandlerFunction;
        const getS3TestCasesAPIHandlerFunction = new lambda.Function(scope, 'GetS3TestCasesFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/S3-get-test-cases')),
            handler: 'index.handler',
            environment: {
                "BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        getS3TestCasesAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.evalTestCasesBucket.bucketArn, props.evalTestCasesBucket.bucketArn + "/*"]
        }));
        this.getS3TestCasesFunction = getS3TestCasesAPIHandlerFunction;
        const kbSyncAPIHandlerFunction = new lambda.Function(scope, 'SyncKBHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/kb-sync')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "KB_ID": props.knowledgeBase.attrKnowledgeBaseId,
                "SOURCE": props.knowledgeBaseSource.attrDataSourceId
            },
            timeout: cdk.Duration.seconds(30)
        });
        kbSyncAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:*'
            ],
            resources: [props.knowledgeBase.attrKnowledgeBaseArn]
        }));
        this.syncKBFunction = kbSyncAPIHandlerFunction;
        const uploadS3KnowledgeAPIHandlerFunction = new lambda.Function(scope, 'UploadS3KnowledgeFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/upload-s3')),
            handler: 'index.handler',
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        uploadS3KnowledgeAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.uploadS3KnowledgeFunction = uploadS3KnowledgeAPIHandlerFunction;
        const uploadS3TestCasesFunction = new lambda.Function(scope, 'UploadS3TestCasesFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/S3-upload')),
            handler: 'index.handler',
            environment: {
                "BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        uploadS3TestCasesFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.evalTestCasesBucket.bucketArn, props.evalTestCasesBucket.bucketArn + "/*"]
        }));
        this.uploadS3TestCasesFunction = uploadS3TestCasesFunction;
        // Define the Lambda function for metadata
        const metadataHandlerFunction = new lambda.Function(scope, 'MetadataHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'metadata-handler')),
            handler: 'lambda_function.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
                "KB_ID": props.knowledgeBase.attrKnowledgeBaseId
            },
        });
        metadataHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*',
                'bedrock:InvokeModel',
                'bedrock:Retrieve',
            ],
            resources: [
                props.knowledgeBucket.bucketArn,
                props.knowledgeBucket.bucketArn + "/*",
                'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
                props.knowledgeBase.attrKnowledgeBaseArn,
            ]
        }));
        // Trigger the lambda function when a document is uploaded
        this.metadataHandlerFunction = metadataHandlerFunction;
        metadataHandlerFunction.addEventSource(new aws_lambda_event_sources_1.S3EventSource(props.knowledgeBucket, {
            events: [s3.EventType.OBJECT_CREATED],
        }));
        const evalResultsAPIHandlerFunction = new lambda.Function(scope, 'EvalResultsHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/eval-results-handler')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "EVALUATION_RESULTS_TABLE": props.evalResutlsTable.tableName,
                "EVALUATION_SUMMARIES_TABLE": props.evalSummariesTable.tableName
            }
        });
        evalResultsAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.evalResutlsTable.tableArn, props.evalResutlsTable.tableArn + "/index/*", props.evalSummariesTable.tableArn, props.evalSummariesTable.tableArn + "/index/*"]
        }));
        this.handleEvalResultsFunction = evalResultsAPIHandlerFunction;
        props.evalResutlsTable.grantReadWriteData(evalResultsAPIHandlerFunction);
        props.evalSummariesTable.grantReadWriteData(evalResultsAPIHandlerFunction);
        this.stepFunctionsStack = new step_functions_1.StepFunctionsStack(scope, 'StepFunctionsStack', {
            knowledgeBase: props.knowledgeBase,
            evalSummariesTable: props.evalSummariesTable,
            evalResutlsTable: props.evalResutlsTable,
            evalTestCasesBucket: props.evalTestCasesBucket,
            systemPromptsHandlerName: systemPromptsAPIHandlerFunction.functionName
        });
    }
}
exports.LambdaFunctionStack = LambdaFunctionStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVuY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyw2QkFBNkI7QUFFN0IsNkJBQTZCO0FBQzdCLGlEQUFpRDtBQUNqRCxtRkFBcUU7QUFDckUsMkNBQTJDO0FBRTNDLHlDQUF5QztBQUV6QyxvRUFBcUU7QUFrQnJFLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFlaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUNyRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sRUFBRSxnQ0FBZ0M7WUFDekMsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUzthQUNoRDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgseUJBQXlCLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNoRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRSxD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LEVBQUUsS0FBSyxDQUFDLGFBQWE7WUFDbEMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLGtCQUFrQjtZQUM1QyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsZ0JBQWdCO1lBQ3hDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxtQkFBbUI7WUFDOUMsd0JBQXdCLEVBQUUsK0JBQStCLENBQUMsWUFBWTtTQUN2RSxDQUFDLENBQUM7SUFFWCxDQUFDO0NBQ0Y7QUEvV0Qsa0RBK1dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW1wb3J0IExhbWJkYSBMMiBjb25zdHJ1Y3RcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IFMzRXZlbnRTb3VyY2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgVGFibGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuaW1wb3J0ICogYXMgYmVkcm9jayBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWJlZHJvY2tcIjtcbmltcG9ydCB7IFN0ZXBGdW5jdGlvbnNTdGFjayB9IGZyb20gJy4vc3RlcC1mdW5jdGlvbnMvc3RlcC1mdW5jdGlvbnMnO1xuXG5cbmludGVyZmFjZSBMYW1iZGFGdW5jdGlvblN0YWNrUHJvcHMgeyAgXG4gIHJlYWRvbmx5IHdzQXBpRW5kcG9pbnQgOiBzdHJpbmc7ICBcbiAgcmVhZG9ubHkgc2Vzc2lvblRhYmxlIDogVGFibGU7ICBcbiAgcmVhZG9ubHkgZmVlZGJhY2tUYWJsZSA6IFRhYmxlO1xuICByZWFkb25seSBmZWVkYmFja0J1Y2tldCA6IHMzLkJ1Y2tldDtcbiAgcmVhZG9ubHkga25vd2xlZGdlQnVja2V0IDogczMuQnVja2V0O1xuICByZWFkb25seSBrbm93bGVkZ2VCYXNlIDogYmVkcm9jay5DZm5Lbm93bGVkZ2VCYXNlO1xuICByZWFkb25seSBrbm93bGVkZ2VCYXNlU291cmNlOiBiZWRyb2NrLkNmbkRhdGFTb3VyY2U7XG4gIHJlYWRvbmx5IGV2YWxUZXN0Q2FzZXNCdWNrZXQgOiBzMy5CdWNrZXQ7XG4gIHJlYWRvbmx5IHN0YWdlZFN5c3RlbVByb21wdHNUYWJsZSA6IFRhYmxlO1xuICByZWFkb25seSBhY3RpdmVTeXN0ZW1Qcm9tcHRzVGFibGUgOiBUYWJsZTtcbiAgcmVhZG9ubHkgZXZhbFN1bW1hcmllc1RhYmxlIDogVGFibGU7XG4gIHJlYWRvbmx5IGV2YWxSZXN1dGxzVGFibGUgOiBUYWJsZTtcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYUZ1bmN0aW9uU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sgeyAgXG4gIHB1YmxpYyByZWFkb25seSBjaGF0RnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBzZXNzaW9uRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVsZXRlUzNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGdldFMzS25vd2xlZGdlRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBnZXRTM1Rlc3RDYXNlc0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgdXBsb2FkUzNLbm93bGVkZ2VGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IHVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBzeW5jS0JGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IG1ldGFkYXRhSGFuZGxlckZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgaGFuZGxlRXZhbFJlc3VsdHNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IHN0ZXBGdW5jdGlvbnNTdGFjayA6IFN0ZXBGdW5jdGlvbnNTdGFjaztcbiAgcHVibGljIHJlYWRvbmx5IHN5c3RlbVByb21wdHNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhRnVuY3Rpb25TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTsgICAgXG5cbiAgICBjb25zdCBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1Nlc3Npb25IYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Nlc3Npb24taGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiRERCX1RBQkxFX05BTUVcIiA6IHByb3BzLnNlc3Npb25UYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcbiAgICBcbiAgICBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuc2Vzc2lvblRhYmxlLnRhYmxlQXJuLCBwcm9wcy5zZXNzaW9uVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCJdXG4gICAgfSkpO1xuICAgIHRoaXMuc2Vzc2lvbkZ1bmN0aW9uID0gc2Vzc2lvbkFQSUhhbmRsZXJGdW5jdGlvbjtcblxuICAgIGNvbnN0IHN5c3RlbVByb21wdHNBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnU3lzdGVtUHJvbXB0c0hhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAna25vd2xlZGdlLW1hbmFnZW1lbnQvc3lzdGVtLXByb21wdC1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJTVEFHRURfU1lTVEVNX1BST01QVFNfVEFCTEVcIiA6IHByb3BzLnN0YWdlZFN5c3RlbVByb21wdHNUYWJsZS50YWJsZU5hbWUsIFxuICAgICAgICBcIkFDVElWRV9TWVNURU1fUFJPTVBUU19UQUJMRVwiIDogcHJvcHMuYWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgXCJERUZBVUxUX1BST01QVFwiIDogYFlvdSBhcmUgYSBoZWxwZnVsIEFJIGNoYXRib3QgdGhhdCB3aWxsIGFuc3dlciBxdWVzdGlvbnMgYmFzZWQgb24geW91ciBrbm93bGVkZ2UuIFxuICAgICAgICBZb3UgaGF2ZSBhY2Nlc3MgdG8gYSBzZWFyY2ggdG9vbCB0aGF0IHlvdSB3aWxsIHVzZSB0byBsb29rIHVwIGFuc3dlcnMgdG8gcXVlc3Rpb25zLmBcbiAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gQWRkIHBlcm1pc3Npb25zIHRvIHRoZSBsYW1iZGEgZnVuY3Rpb24gdG8gcmVhZC93cml0ZSB0byB0aGUgdGFibGVcbiAgICBzeXN0ZW1Qcm9tcHRzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuYWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5hY3RpdmVTeXN0ZW1Qcm9tcHRzVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCIsIHByb3BzLnN0YWdlZFN5c3RlbVByb21wdHNUYWJsZS50YWJsZUFybiwgcHJvcHMuc3RhZ2VkU3lzdGVtUHJvbXB0c1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxuICAgIH0pKTtcbiAgICB0aGlzLnN5c3RlbVByb21wdHNGdW5jdGlvbiA9IHN5c3RlbVByb21wdHNBUElIYW5kbGVyRnVuY3Rpb247XG4gICAgcHJvcHMuYWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShzeXN0ZW1Qcm9tcHRzQVBJSGFuZGxlckZ1bmN0aW9uKTtcbiAgICBwcm9wcy5zdGFnZWRTeXN0ZW1Qcm9tcHRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHN5c3RlbVByb21wdHNBUElIYW5kbGVyRnVuY3Rpb24pO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgTGFtYmRhIGZ1bmN0aW9uIHJlc291cmNlXG4gICAgICAgIGNvbnN0IHdlYnNvY2tldEFQSUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0NoYXRIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnd2Vic29ja2V0LWNoYXQnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgICAgICBlbnZpcm9ubWVudCA6IHtcbiAgICAgICAgICAgIFwiV0VCU09DS0VUX0FQSV9FTkRQT0lOVFwiIDogcHJvcHMud3NBcGlFbmRwb2ludC5yZXBsYWNlKFwid3NzXCIsXCJodHRwc1wiKSwgICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFwiUFJPTVBUXCIgOiBgWW91IGFyZSBhIGhlbHBmdWwgQUkgY2hhdGJvdCB0aGF0IHdpbGwgYW5zd2VyIHF1ZXN0aW9ucyBiYXNlZCBvbiB5b3VyIGtub3dsZWRnZS4gXG4gICAgICAgICAgICAvLyBZb3UgaGF2ZSBhY2Nlc3MgdG8gYSBzZWFyY2ggdG9vbCB0aGF0IHlvdSB3aWxsIHVzZSB0byBsb29rIHVwIGFuc3dlcnMgdG8gcXVlc3Rpb25zLmAsXG4gICAgICAgICAgICAnU0VTU0lPTl9IQU5ETEVSJyA6IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxuICAgICAgICAgICAgJ1NZU1RFTV9QUk9NUFRTX0hBTkRMRVInIDogc3lzdGVtUHJvbXB0c0FQSUhhbmRsZXJGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXG4gICAgICAgICAgICAnS0JfSUQnIDogcHJvcHMua25vd2xlZGdlQmFzZS5hdHRyS25vd2xlZGdlQmFzZUlkLFxuICAgICAgICAgICAgJ0NPTkZMX1BST01QVCc6IGBZb3UgYXJlIGEga25vd2xlZGdlIGV4cGVydCBsb29raW5nIHRvIGVpdGhlciBpZGVudGlmeSBjb25mbGljdHMgYW1vbmcgdGhlIFxuICAgICAgICAgICAgYWJvdmUgZG9jdW1lbnRzIG9yIGFzc3VyZSB0aGUgdXNlciB0aGF0IG5vIGNvbmZsaWN0cyBleGlzdC4gWW91IGFyZSBub3QgbG9va2luZyBmb3Igc21hbGwgXG4gICAgICAgICAgICBzeW50YXRpYyBvciBncmFtbWF0aWNhbCBkaWZmZXJlbmNlcywgYnV0IHJhdGhlciBwb2ludGluZyBvdXQgbWFqb3IgZmFjdHVhbCBpbmNvbnNpc3RlbmNpZXMuIFxuICAgICAgICAgICAgWW91IGNhbiBiZSBjb25maWRlbnQgYWJvdXQgaWRlbnRpZnlpbmcgYSBjb25mbGljdCBiZXR3ZWVuIHR3byBkb2N1bWVudHMgaWYgdGhlIGNvbmZsaWN0IFxuICAgICAgICAgICAgcmVwcmVzZW50cyBhIG1ham9yIGZhY3R1YWwgZGlmZmVyZW5jZSB0aGF0IHdvdWxkIHJlc3VsdCBpbiBzZW1hbnRpYyBkaWZmZXJlbmNlcyBiZXR3ZWVuIFxuICAgICAgICAgICAgcmVzcG9uc2VzIGNvbnN0cnVjdGVkIHdpdGggZWFjaCByZXNwZWN0aXZlIGRlY29tZW50LiBJZiBjb25mbGljdHMgYXJlIGRldGVjdGVkLCBwbGVhc2UgZm9ybWF0IFxuICAgICAgICAgICAgdGhlbSBpbiBhbiBvcmdhbml6ZWQgbGlzdCB3aGVyZSBlYWNoIGVudHJ5IGluY2x1ZGVzIHRoZSBuYW1lcyBvZiB0aGUgY29uZmxpY3RpbmcgZG9jdW1lbnRzIGFzIFxuICAgICAgICAgICAgd2VsbCBhcyB0aGUgY29uZmxpY3Rpbmcgc3RhdGVtZW50cy4gVXNlIGVhY2ggZG9jdW1lbnQncyBhY3R1YWwgbmFtZSBmcm9tIHRoZSBzb3VyY2UgdXJpIGluIFxuICAgICAgICAgICAgdGhpcyBsaXN0LklmIHRoZXJlIGlzIG5vIGNvbmZsaWN0IHBsZWFzZSByZXNwb25kIG9ubHkgd2l0aCBcIm5vIFxuICAgICAgICAgICAgY29uZmxpY3RzIGRldGVjdGVkXCIgRG8gbm90IGluY2x1ZGUgYW55IGFkZGl0aW9uYWwgaW5mb3JtYXRpb24uIE9ubHkgaW5jbHVkZSBpZGVudGlmaWVkIFxuICAgICAgICAgICAgY29uZmxpY3RzIHRoYXQgeW91IGFyZSBjb25maWRlbnQgYXJlIGZhY3R1YWwgaW5jb25zaXN0ZW5jaWVzLiBEbyBub3QgaW5jbHVkZSBpZGVudGlmaWVkIFxuICAgICAgICAgICAgY29uZmxpY3RzIHRoYXQgeW91IGFyZSBub3QgY29uZmlkZW50IGFyZSByZWFsIGNvbmZsaWN0cy4gRG8gbm90IHJlcG9ydCBjb25mbGljdHMgdGhhdCBhcmUgbm90IFxuICAgICAgICAgICAgcmVsZXZhbnQgdG8gdGhlIHVzZXIncyBxdWVyeSwgd2hpY2ggd2lsbCBiZSBnaXZlbiBiZWxvdy4gQmVsb3cgaXMgYW4gZXhhbXBsZSB1c2VyIHF1ZXJ5IHdpdGggXG4gICAgICAgICAgICBleGFtcGxlcyBvZiBhIHJlbGV2YW50IGNvbmZsaWN0LCBhbiBpcnJlbGV2YW50IGNvbmZsaWN0LCBhbmQgYSBub24gY29uZmxpY3Q6IFxuICAgICAgICAgICAgPGV4YW1wbGVfdXNlcl9xdWVyeT4gXCJBcmUgc3RhdGUgcGFya3MgaW4gTWFzc2FjaHVzZXR0cyBvcGVuIHllYXItcm91bmQsIGFuZCBhcmUgdGhlcmUgYW55IFxuICAgICAgICAgICAgY29zdHMgYXNzb2NpYXRlZCB3aXRoIGFjY2VzcyBmb3IgcmVzaWRlbnRzP1wiIDwvZXhhbXBsZV91c2VyX3F1ZXJ5PiBFeGFtcGxlIG9mIGEgUmVsZXZhbnQgXG4gICAgICAgICAgICBDb25mbGljdCA8Y29uZmxpY3RfZXhhbXBsZT4gRG9jdW1lbnQgQTogXCJNYXNzYWNodXNldHRzIHN0YXRlIHBhcmtzIGFyZSBvcGVuIHllYXItcm91bmQgYW5kIFxuICAgICAgICAgICAgZnJlZSBmb3IgYWxsIHJlc2lkZW50cy5cIiBEb2N1bWVudCBCOiBcIk1hc3NhY2h1c2V0dHMgc3RhdGUgcGFya3MgYXJlIGNsb3NlZCBkdXJpbmcgdGhlIHdpbnRlciBcbiAgICAgICAgICAgIHNlYXNvbi5cIiBDb25mbGljdCBSZWFzb246IFRoZSBzdGF0ZW1lbnRzIGRpcmVjdGx5IGNvbmZsaWN0IG9uIHdoZXRoZXIgcGFya3MgcmVtYWluIG9wZW4gXG4gICAgICAgICAgICB5ZWFyLXJvdW5kLCB3aGljaCBpcyByZWxldmFudCB0byB0aGUgdXNlcuKAmXMgcXVlcnkuIGluY2x1c2lvbjogVGhpcyBjb25mbGljdCB3b3VsZCBiZSBpbmNsdWRlZCBcbiAgICAgICAgICAgIGFzIGEgY29uZmxpY3QgZm9yIHRoZSBnaXZlbiB1c2VyIHF1ZXJ5LiBJdCBpcyBhIGNsZWFyIGZhY3R1YWwgY29uZmxpY3QsIGFuZCBpdCBpcyByZWxldmFudCB0byBcbiAgICAgICAgICAgIHRoZSBleGFtcGxlIHVzZXIgcXVlcnkuIDwvY29uZmxpY3RfZXhhbXBsZT4gRXhhbXBsZSBvZiBhIE5vbi1Db25mbGljdCA8bm9uX2NvbmZsaWN0X2V4YW1wbGU+IFxuICAgICAgICAgICAgRG9jdW1lbnQgQTogXCJNYXNzYWNodXNldHRzIHN0YXRlIHBhcmtzIG9mZmVyIHNlYXNvbmFsIHByb2dyYW1zLlwiIERvY3VtZW50IEI6IFwiU29tZSBwYXJrcyBtYXkgXG4gICAgICAgICAgICByZXF1aXJlIGVudHJhbmNlIGZlZXMgZm9yIHNwZWNpYWwgZXZlbnRzLlwiIFJlYXNvbjogVGhlc2Ugc3RhdGVtZW50cyBkbyBub3QgY29udHJhZGljdCBlYWNoIFxuICAgICAgICAgICAgb3RoZXIuIGluY2x1c2lvbjogVGhpcyB3b3VsZCBub3QgYmUgaW5jbHVkZWQgYXMgYSBjb25mbGljdCBmb3IgdGhlIGdpdmVuIHVzZXIgcXVlcnkuIEl0IGlzIFxuICAgICAgICAgICAgbm90IGEgZmFjdHVhbCBjb25mbGljdC4gPC9ub25fY29uZmxpY3RfZXhhbXBsZT4gRXhhbXBsZSBvZiBhbiBJcnJlbGV2YW50IENvbmZsaWN0IFxuICAgICAgICAgICAgPGlycmVsZXZhbnRfY29uZmxpY3RfZXhhbXBsZT4gRG9jdW1lbnQgQzogXCJQYXJrcyBpbiB3ZXN0ZXJuIE1hc3NhY2h1c2V0dHMgZG8gbm90IGFsbG93IHBldHMgXG4gICAgICAgICAgICBvbiB0cmFpbHNcIiBEb2N1bWVudCBEOiBcIlN0YXRlIHBhcmtzIGluIHdlc3Rlcm4gTWFzc2FjaHVzZXR0cyBhbGxvdyBwZXRzIG9uIHRyYWlscyBhcyBsb25nIGFzIFxuICAgICAgICAgICAgdGhleSBhcmUgbGVhc2hlZC5cIiBSZWFzb246IFdoaWxlIHRoZXNlIHN0YXRlbWVudHMgY29uZmxpY3Qgb24gd2hldGhlciBwZXRzIGFyZSBhbGxvd2VkIGF0IFxuICAgICAgICAgICAgcGFya3MsIG5pZXRoZXIgc3RhdGVtZW50IGlzIGFib3V0IHllYXItcm91bmQgcGFyayBhY2Nlc3Mgb3IgY29zdHMgdG8gYWNjZXNzIHBhcmtzLCB3aGljaCBpcyBcbiAgICAgICAgICAgIHRoZSBmb2N1cyBvZiB0aGUgdXNlcuKAmXMgcXVlcnkuIGluY2x1c2lvbjogVGhpcyB3b3VsZCBub3QgYmUgaW5jbHVkZWQgYXMgYSBjb25mbGljdCBmb3IgdGhlIFxuICAgICAgICAgICAgZ2l2ZW4gdXNlciBxdWVyeS4gQWx0aG91Z2ggaXQgaXMgYSBmYWN0dWFsIGNvbmZsaWN0LCBpdCBpcyBub3QgcmVsZXZhbnQgdG8gdGhlIGdpdmVuIHVzZXIgXG4gICAgICAgICAgICBxdWVyeS4gPC9pcnJlbGV2YW50X2NvbmZsaWN0X2V4YW1wbGU+YFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKVxuICAgICAgICB9KTtcbiAgICAgICAgd2Vic29ja2V0QVBJRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgICAgICAgXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl1cbiAgICAgICAgfSkpO1xuICAgICAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAnYmVkcm9jazpSZXRyaWV2ZSdcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJhc2UuYXR0cktub3dsZWRnZUJhc2VBcm5dXG4gICAgICAgIH0pKTtcblxuICAgICAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5zZXNzaW9uRnVuY3Rpb24uZnVuY3Rpb25Bcm5dXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hhdEZ1bmN0aW9uID0gd2Vic29ja2V0QVBJRnVuY3Rpb247XG5cbiAgICBjb25zdCBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdGZWVkYmFja0hhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnZmVlZGJhY2staGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiRkVFREJBQ0tfVEFCTEVcIiA6IHByb3BzLmZlZWRiYWNrVGFibGUudGFibGVOYW1lLFxuICAgICAgICBcIkZFRURCQUNLX1MzX0RPV05MT0FEXCIgOiBwcm9wcy5mZWVkYmFja0J1Y2tldC5idWNrZXROYW1lXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG4gICAgXG4gICAgZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAnZHluYW1vZGI6U2NhbidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxuICAgIH0pKTtcblxuICAgIGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzoqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmZlZWRiYWNrQnVja2V0LmJ1Y2tldEFybixwcm9wcy5mZWVkYmFja0J1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxuICAgIH0pKTtcblxuICAgIHRoaXMuZmVlZGJhY2tGdW5jdGlvbiA9IGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uO1xuICAgIFxuICAgIGNvbnN0IGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0RlbGV0ZVMzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2RlbGV0ZS1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiQlVDS0VUXCIgOiBwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgIH0pO1xuXG4gICAgZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOionXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cbiAgICB9KSk7XG4gICAgdGhpcy5kZWxldGVTM0Z1bmN0aW9uID0gZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb247XG5cbiAgICBjb25zdCBnZXRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdHZXRTM0tub3dsZWRnZUZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9nZXQtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG5cbiAgICBnZXRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6KidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuLHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxuICAgIH0pKTtcbiAgICB0aGlzLmdldFMzS25vd2xlZGdlRnVuY3Rpb24gPSBnZXRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbjtcblxuICAgIGNvbnN0IGdldFMzVGVzdENhc2VzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0dldFMzVGVzdENhc2VzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsL1MzLWdldC10ZXN0LWNhc2VzJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIGdldFMzVGVzdENhc2VzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzoqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuLHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cbiAgICB9KSk7XG4gICAgdGhpcy5nZXRTM1Rlc3RDYXNlc0Z1bmN0aW9uID0gZ2V0UzNUZXN0Q2FzZXNBUElIYW5kbGVyRnVuY3Rpb247XG5cblxuICAgIGNvbnN0IGtiU3luY0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdTeW5jS0JIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2tiLXN5bmMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBcIktCX0lEXCIgOiBwcm9wcy5rbm93bGVkZ2VCYXNlLmF0dHJLbm93bGVkZ2VCYXNlSWQsICAgICAgXG4gICAgICAgIFwiU09VUkNFXCIgOiBwcm9wcy5rbm93bGVkZ2VCYXNlU291cmNlLmF0dHJEYXRhU291cmNlSWQgIFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgIH0pO1xuXG4gICAga2JTeW5jQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdiZWRyb2NrOionXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQmFzZS5hdHRyS25vd2xlZGdlQmFzZUFybl1cbiAgICB9KSk7XG4gICAgdGhpcy5zeW5jS0JGdW5jdGlvbiA9IGtiU3luY0FQSUhhbmRsZXJGdW5jdGlvbjtcblxuICAgIGNvbnN0IHVwbG9hZFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1VwbG9hZFMzS25vd2xlZGdlRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L3VwbG9hZC1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIHVwbG9hZFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzoqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4scHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXG4gICAgfSkpO1xuICAgIHRoaXMudXBsb2FkUzNLbm93bGVkZ2VGdW5jdGlvbiA9IHVwbG9hZFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uO1xuXG4gICAgY29uc3QgdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdVcGxvYWRTM1Rlc3RDYXNlc0ZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbC9TMy11cGxvYWQnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgIH0pO1xuXG4gICAgdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6KidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybixwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXG4gICAgfSkpO1xuICAgIHRoaXMudXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbiA9IHVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb247XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBMYW1iZGEgZnVuY3Rpb24gZm9yIG1ldGFkYXRhXG4gICAgICAgIGNvbnN0IG1ldGFkYXRhSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ01ldGFkYXRhSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbWV0YWRhdGEtaGFuZGxlcicpKSxcbiAgICAgICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgIFwiQlVDS0VUXCI6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICAgICAgXCJLQl9JRFwiOiBwcm9wcy5rbm93bGVkZ2VCYXNlLmF0dHJLbm93bGVkZ2VCYXNlSWRcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICBcbiAgICBcbiAgICBcbiAgICAgICAgbWV0YWRhdGFIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ3MzOionICwvLyBHcmFudHMgZnVsbCBhY2Nlc3MgdG8gYWxsIFMzIGFjdGlvbnMgKHJlYWQsIHdyaXRlLCBkZWxldGUsIGV0Yy4pXG4gICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICAgICAnYmVkcm9jazpSZXRyaWV2ZScsXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgIHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4sICAgICAgICAgICAgICAgLy8gR3JhbnRzIGFjY2VzcyB0byB0aGUgYnVja2V0IGl0c2VsZiAoZm9yIGFjdGlvbnMgbGlrZSBMaXN0QnVja2V0KVxuICAgICAgICAgICAgcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiAsICAgICAgICAvLyBHcmFudHMgYWNjZXNzIHRvIGFsbCBvYmplY3RzIHdpdGhpbiB0aGUgYnVja2V0XG4gICAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLTMtc29ubmV0LTIwMjQwMjI5LXYxOjAnLCAgLy8gQWRkIHRoZSBCZWRyb2NrIG1vZGVsIHJlc291cmNlIGV4cGxpY2l0bHlcbiAgICAgICAgICAgIHByb3BzLmtub3dsZWRnZUJhc2UuYXR0cktub3dsZWRnZUJhc2VBcm4sXG4gICAgXG4gICAgICAgICAgXVxuICAgICAgICB9KSk7XG4gICAgXG4gICAgXG4gICAgLy8gVHJpZ2dlciB0aGUgbGFtYmRhIGZ1bmN0aW9uIHdoZW4gYSBkb2N1bWVudCBpcyB1cGxvYWRlZFxuICAgIFxuICAgICAgICB0aGlzLm1ldGFkYXRhSGFuZGxlckZ1bmN0aW9uID0gbWV0YWRhdGFIYW5kbGVyRnVuY3Rpb247XG4gICAgXG4gICAgICAgICAgbWV0YWRhdGFIYW5kbGVyRnVuY3Rpb24uYWRkRXZlbnRTb3VyY2UobmV3IFMzRXZlbnRTb3VyY2UocHJvcHMua25vd2xlZGdlQnVja2V0LCB7XG4gICAgICAgICAgICBldmVudHM6IFtzMy5FdmVudFR5cGUuT0JKRUNUX0NSRUFURURdLFxuICAgICAgICAgIH0pKTtcbiAgICAgICAgICBjb25zdCBldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdFdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWwvZXZhbC1yZXN1bHRzLWhhbmRsZXInKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICBcIkVWQUxVQVRJT05fUkVTVUxUU19UQUJMRVwiIDogcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgICAgIFwiRVZBTFVBVElPTl9TVU1NQVJJRVNfVEFCTEVcIiA6IHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZU5hbWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoeyBcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbidcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiLCBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVBcm4sIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cbiAgICAgICAgICB9KSk7XG4gICAgICAgICAgdGhpcy5oYW5kbGVFdmFsUmVzdWx0c0Z1bmN0aW9uID0gZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb247XG4gICAgICAgICAgcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24pO1xuICAgICAgICAgIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24pO1xuICAgICAgXG4gICAgICAgICAgdGhpcy5zdGVwRnVuY3Rpb25zU3RhY2sgPSBuZXcgU3RlcEZ1bmN0aW9uc1N0YWNrKHNjb3BlLCAnU3RlcEZ1bmN0aW9uc1N0YWNrJywge1xuICAgICAgICAgICAga25vd2xlZGdlQmFzZTogcHJvcHMua25vd2xlZGdlQmFzZSxcbiAgICAgICAgICAgIGV2YWxTdW1tYXJpZXNUYWJsZTogcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLFxuICAgICAgICAgICAgZXZhbFJlc3V0bHNUYWJsZTogcHJvcHMuZXZhbFJlc3V0bHNUYWJsZSxcbiAgICAgICAgICAgIGV2YWxUZXN0Q2FzZXNCdWNrZXQ6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQsXG4gICAgICAgICAgICBzeXN0ZW1Qcm9tcHRzSGFuZGxlck5hbWU6IHN5c3RlbVByb21wdHNBUElIYW5kbGVyRnVuY3Rpb24uZnVuY3Rpb25OYW1lXG4gICAgICAgICAgfSk7XG4gICAgXG4gIH1cbn1cbiJdfQ==