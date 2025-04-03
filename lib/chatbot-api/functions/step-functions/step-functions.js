"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepFunctionsStack = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const path = require("path");
// Import Lambda L2 construct
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const aws_ecr_assets_1 = require("aws-cdk-lib/aws-ecr-assets");
const stepfunctions = require("aws-cdk-lib/aws-stepfunctions");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
class StepFunctionsStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const splitEvalTestCasesFunction = new lambda.Function(this, 'SplitEvalTestCasesFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/split-test-cases')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        splitEvalTestCasesFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:ListBucket',
                's3:PutObject'
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.splitEvalTestCasesFunction = splitEvalTestCasesFunction;
        const llmEvalResultsHandlerFunction = new lambda.Function(this, 'LlmEvalResultsHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/results-to-ddb')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "EVAL_SUMMARIES_TABLE": props.evalSummariesTable.tableName,
                "EVAL_RESULTS_TABLE": props.evalResutlsTable.tableName,
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        llmEvalResultsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
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
        llmEvalResultsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        props.evalResutlsTable.grantReadWriteData(llmEvalResultsHandlerFunction);
        props.evalSummariesTable.grantReadWriteData(llmEvalResultsHandlerFunction);
        this.llmEvalResultsHandlerFunction = llmEvalResultsHandlerFunction;
        const generateResponseFunction = new lambda.Function(this, 'GenerateResponseFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/generate-response')),
            handler: 'index.handler',
            environment: {
                "PROMPT": `You are a helpful AI chatbot that will answer questions based on your knowledge. 
                You have access to a search tool that you will use to look up answers to questions.`,
                'KB_ID': props.knowledgeBase.attrKnowledgeBaseId,
                'SYSTEM_PROMPTS_HANDLER_ARN': props.systemPromptsHandlerName
            },
            timeout: cdk.Duration.seconds(30)
        });
        generateResponseFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel',
            ],
            resources: ["*"]
        }));
        generateResponseFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:Retrieve'
            ],
            resources: [props.knowledgeBase.attrKnowledgeBaseArn]
        }));
        this.generateResponseFunction = generateResponseFunction;
        const llmEvalFunction = new lambda.DockerImageFunction(this, 'LlmEvaluationFunction', {
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, 'llm-evaluation/eval'), {
                platform: aws_ecr_assets_1.Platform.LINUX_AMD64, // Specify the correct platform
            }),
            environment: {
                "GENERATE_RESPONSE_LAMBDA_NAME": generateResponseFunction.functionName,
                "BEDROCK_MODEL_ID": "anthropic.claude-3-haiku-20240307-v1:0",
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.minutes(15),
            memorySize: 10240
        });
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetAuthorization',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:BatchCheckLayerAvailability'
            ],
            resources: ['*']
        }));
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel'
            ],
            resources: ['*']
        }));
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        generateResponseFunction.grantInvoke(llmEvalFunction);
        this.llmEvalFunction = llmEvalFunction;
        const aggregateEvalResultsFunction = new lambda.Function(this, 'AggregateEvalResultsFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/aggregate-eval-results')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        aggregateEvalResultsFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.aggregateEvalResultsFunction = aggregateEvalResultsFunction;
        const llmEvalCleanupFunction = new lambda.Function(this, 'LlmEvalCleanupFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/cleanup')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        llmEvalCleanupFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:ListBucket',
                's3:DeleteObject',
                's3:DeleteObjects'
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.llmEvalCleanupFunction = llmEvalCleanupFunction;
        const splitTestCasesTask = new tasks.LambdaInvoke(this, 'Split Test Cases', {
            lambdaFunction: this.splitEvalTestCasesFunction,
            outputPath: '$.Payload',
        });
        const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
            lambdaFunction: this.llmEvalFunction,
            // payload: stepfunctions.TaskInput.fromObject({
            //     'chunk_key.$': '$',
            //     'evaluation_id.$': '$.evaluation_id',
            // }),
            outputPath: '$.Payload',
        });
        const processTestCasesMap = new stepfunctions.Map(this, 'Process Test Cases', {
            itemsPath: '$.chunk_keys',
            maxConcurrency: 5,
            resultPath: '$.partial_result_keys',
            itemSelector: {
                'chunk_key.$': '$$.Map.Item.Value.chunk_key',
                'evaluation_id.$': '$$.Map.Item.Value.evaluation_id',
            },
        });
        processTestCasesMap.itemProcessor(evaluateTestCasesTask);
        const aggregateResultsTask = new tasks.LambdaInvoke(this, 'Aggregate Results', {
            lambdaFunction: this.aggregateEvalResultsFunction,
            payload: stepfunctions.TaskInput.fromObject({
                //'partial_results_list.$': '$.ProcessedResults',
                'partial_result_keys.$': '$.partial_result_keys',
                'evaluation_id.$': '$.evaluation_id',
                'evaluation_name.$': '$.evaluation_name',
                'test_cases_key.$': '$.test_cases_key',
            }),
            outputPath: '$.Payload',
        });
        const saveResultsTask = new tasks.LambdaInvoke(this, 'Save Evaluation Results', {
            lambdaFunction: this.llmEvalResultsHandlerFunction,
            payload: stepfunctions.TaskInput.fromObject({
                'evaluation_id.$': '$.evaluation_id',
                'evaluation_name.$': '$.evaluation_name',
                'average_similarity.$': '$.average_similarity',
                'average_relevance.$': '$.average_relevance',
                'average_correctness.$': '$.average_correctness',
                'total_questions.$': '$.total_questions',
                'detailed_results_s3_key.$': '$.detailed_results_s3_key',
                // 'detailed_results.$': '$.detailed_results',
                'test_cases_key.$': '$.test_cases_key',
            }),
            outputPath: '$.Payload',
        });
        const cleanupChunksTask = new tasks.LambdaInvoke(this, 'Cleanup Chunks', {
            lambdaFunction: this.llmEvalCleanupFunction,
            payload: stepfunctions.TaskInput.fromObject({
                'body.$': '$.body',
            }),
            outputPath: '$.Payload',
        });
        const definition = splitTestCasesTask
            .next(processTestCasesMap)
            .next(aggregateResultsTask)
            .next(saveResultsTask)
            .next(cleanupChunksTask);
        const llmEvalStateMachine = new stepfunctions.StateMachine(this, 'EvaluationStateMachine', {
            definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
            timeout: cdk.Duration.hours(1),
        });
        this.llmEvalStateMachine = llmEvalStateMachine;
        const startLlmEvalStateMachineFunction = new lambda.Function(this, 'StartLlmEvalStateMachineFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/start-llm-eval')),
            handler: 'index.handler',
            environment: {
                "STATE_MACHINE_ARN": this.llmEvalStateMachine.stateMachineArn
            },
            timeout: cdk.Duration.seconds(30)
        });
        startLlmEvalStateMachineFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['states:StartExecution'],
            resources: [this.llmEvalStateMachine.stateMachineArn],
        }));
        this.startLlmEvalStateMachineFunction = startLlmEvalStateMachineFunction;
    }
}
exports.StepFunctionsStack = StepFunctionsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RlcC1mdW5jdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGVwLWZ1bmN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBQ3ZDLDZCQUE2QjtBQUU3Qiw2QkFBNkI7QUFDN0IsaURBQWlEO0FBQ2pELDJDQUEyQztBQUkzQywrREFBc0Q7QUFFdEQsK0RBQStEO0FBQy9ELDZEQUE2RDtBQVU3RCxNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBVTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBOEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLDBCQUEwQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLEVBQUU7WUFDdkYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztZQUNwRixPQUFPLEVBQUUsZ0NBQWdDO1lBQ3pDLFdBQVcsRUFBRTtnQkFDVCxtQkFBbUIsRUFBRyxLQUFLLENBQUMsbUJBQW1CLENBQUMsVUFBVTthQUM3RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDcEMsQ0FBQyxDQUFDO1FBQ0gsMEJBQTBCLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUMvRCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDTCxjQUFjO2dCQUNkLGVBQWU7Z0JBQ2YsY0FBYzthQUNqQjtZQUNELFNBQVMsRUFBRTtnQkFDUCxLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBUztn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QUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDcEMsQ0FBQyxDQUFDO1FBQ0gsZ0NBQWdDLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNyRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDO1lBQ2xDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7U0FDeEQsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsZ0NBQWdDLEdBQUcsZ0NBQWdDLENBQUM7SUFDN0UsQ0FBQztDQUNKO0FBaFNELGdEQWdTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbi8vIEltcG9ydCBMYW1iZGEgTDIgY29uc3RydWN0XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBUYWJsZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBiZWRyb2NrIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtYmVkcm9ja1wiO1xuaW1wb3J0IHsgUGxhdGZvcm0gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyLWFzc2V0cyc7XG5pbXBvcnQgeyBTdGF0ZU1hY2hpbmUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucyc7XG5pbXBvcnQgKiBhcyBzdGVwZnVuY3Rpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcbmltcG9ydCAqIGFzIHRhc2tzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJztcblxuaW50ZXJmYWNlIFN0ZXBGdW5jdGlvbnNTdGFja1Byb3BzIHtcbiAgICByZWFkb25seSBrbm93bGVkZ2VCYXNlIDogYmVkcm9jay5DZm5Lbm93bGVkZ2VCYXNlO1xuICAgIHJlYWRvbmx5IGV2YWxTdW1tYXJpZXNUYWJsZSA6IFRhYmxlO1xuICAgIHJlYWRvbmx5IGV2YWxSZXN1dGxzVGFibGUgOiBUYWJsZTtcbiAgICByZWFkb25seSBldmFsVGVzdENhc2VzQnVja2V0IDogczMuQnVja2V0O1xuICAgIHJlYWRvbmx5IHN5c3RlbVByb21wdHNIYW5kbGVyTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgU3RlcEZ1bmN0aW9uc1N0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3BsaXRFdmFsVGVzdENhc2VzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gICAgcHVibGljIHJlYWRvbmx5IGxsbUV2YWxGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICAgIHB1YmxpYyByZWFkb25seSBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG4gICAgcHVibGljIHJlYWRvbmx5IGxsbUV2YWxDbGVhbnVwRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGxtRXZhbFN0YXRlTWFjaGluZTogU3RhdGVNYWNoaW5lO1xuXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFN0ZXBGdW5jdGlvbnNTdGFja1Byb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAgICAgY29uc3Qgc3BsaXRFdmFsVGVzdENhc2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbicsIHtcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9zcGxpdC10ZXN0LWNhc2VzJykpLCBcbiAgICAgICAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCBcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgXCJURVNUX0NBU0VTX0JVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgICAgIH0pO1xuICAgICAgICBzcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpMaXN0QnVja2V0JyxcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0J1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuLCBcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiwgXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXG4gICAgICAgICAgICBdXG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhpcy5zcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbiA9IHNwbGl0RXZhbFRlc3RDYXNlc0Z1bmN0aW9uO1xuXG4gICAgICAgIGNvbnN0IGxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vcmVzdWx0cy10by1kZGInKSksIFxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICBcIkVWQUxfU1VNTUFSSUVTX1RBQkxFXCIgOiBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgIFwiRVZBTF9SRVNVTFRTX1RBQkxFXCIgOiBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgICAgICBcIlRFU1RfQ0FTRVNfQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgICAgIH0pO1xuICAgICAgICBsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVBcm4sIHByb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCIsIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZUFybiwgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxuICAgICAgICB9KSk7XG4gICAgICAgIGxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuICsgXCIvKlwiLCBcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSkpO1xuICAgICAgICBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbik7XG4gICAgICAgIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24pO1xuICAgICAgICB0aGlzLmxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uID0gbGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb247IFxuXG4gICAgICAgIGNvbnN0IGdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbicsIHtcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9nZW5lcmF0ZS1yZXNwb25zZScpKSwgXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIFxuICAgICAgICAgICAgZW52aXJvbm1lbnQgOiB7XG4gICAgICAgICAgICAgICAgXCJQUk9NUFRcIiA6IGBZb3UgYXJlIGEgaGVscGZ1bCBBSSBjaGF0Ym90IHRoYXQgd2lsbCBhbnN3ZXIgcXVlc3Rpb25zIGJhc2VkIG9uIHlvdXIga25vd2xlZGdlLiBcbiAgICAgICAgICAgICAgICBZb3UgaGF2ZSBhY2Nlc3MgdG8gYSBzZWFyY2ggdG9vbCB0aGF0IHlvdSB3aWxsIHVzZSB0byBsb29rIHVwIGFuc3dlcnMgdG8gcXVlc3Rpb25zLmAsXG4gICAgICAgICAgICAgICAgJ0tCX0lEJyA6IHByb3BzLmtub3dsZWRnZUJhc2UuYXR0cktub3dsZWRnZUJhc2VJZCxcbiAgICAgICAgICAgICAgICAnU1lTVEVNX1BST01QVFNfSEFORExFUl9BUk4nIDogcHJvcHMuc3lzdGVtUHJvbXB0c0hhbmRsZXJOYW1lXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbScsXG4gICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICAgIH0pKTtcbiAgICAgICAgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICdiZWRyb2NrOlJldHJpZXZlJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJhc2UuYXR0cktub3dsZWRnZUJhc2VBcm5dXG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb24gPSBnZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb247XG5cbiAgICAgICAgY29uc3QgbGxtRXZhbEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5Eb2NrZXJJbWFnZUZ1bmN0aW9uKHRoaXMsICdMbG1FdmFsdWF0aW9uRnVuY3Rpb24nLCB7XG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuRG9ja2VySW1hZ2VDb2RlLmZyb21JbWFnZUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9ldmFsJyksIHtcbiAgICAgICAgICAgICAgICBwbGF0Zm9ybTogUGxhdGZvcm0uTElOVVhfQU1ENjQsIC8vIFNwZWNpZnkgdGhlIGNvcnJlY3QgcGxhdGZvcm1cbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgIFwiR0VORVJBVEVfUkVTUE9OU0VfTEFNQkRBX05BTUVcIiA6IGdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXG4gICAgICAgICAgICAgICAgXCJCRURST0NLX01PREVMX0lEXCIgOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowXCIsXG4gICAgICAgICAgICAgICAgXCJURVNUX0NBU0VTX0JVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxuICAgICAgICAgICAgbWVtb3J5U2l6ZTogMTAyNDBcbiAgICAgICAgfSk7XG4gICAgICAgIGxsbUV2YWxGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAnZWNyOkdldEF1dGhvcml6YXRpb24nLFxuICAgICAgICAgICAgICAnZWNyOkdldERvd25sb2FkVXJsRm9yTGF5ZXInLFxuICAgICAgICAgICAgICAnZWNyOkJhdGNoR2V0SW1hZ2UnLFxuICAgICAgICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eSdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddXG4gICAgICAgIH0pKTtcbiAgICAgICAgbGxtRXZhbEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXVxuICAgICAgICB9KSk7XG4gICAgICAgIGxsbUV2YWxGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuLCBcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiwgXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXG4gICAgICAgICAgICBdXG4gICAgICAgIH0pKTtcbiAgICAgICAgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uLmdyYW50SW52b2tlKGxsbUV2YWxGdW5jdGlvbik7XG4gICAgICAgIHRoaXMubGxtRXZhbEZ1bmN0aW9uID0gbGxtRXZhbEZ1bmN0aW9uO1xuXG4gICAgICAgIGNvbnN0IGFnZ3JlZ2F0ZUV2YWxSZXN1bHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uJywge1xuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsdWF0aW9uL2FnZ3JlZ2F0ZS1ldmFsLXJlc3VsdHMnKSksIFxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICBcIlRFU1RfQ0FTRVNfQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgICAgIH0pO1xuICAgICAgICBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuICsgXCIvKlwiLCBcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLmFnZ3JlZ2F0ZUV2YWxSZXN1bHRzRnVuY3Rpb24gPSBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uO1xuXG4gICAgICAgIGNvbnN0IGxsbUV2YWxDbGVhbnVwRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMbG1FdmFsQ2xlYW51cEZ1bmN0aW9uJywge1xuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsdWF0aW9uL2NsZWFudXAnKSksIFxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICBcIlRFU1RfQ0FTRVNfQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICAgICAgfSk7XG4gICAgICAgIGxsbUV2YWxDbGVhbnVwRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdHMnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuICsgXCIvKlwiLCBcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLmxsbUV2YWxDbGVhbnVwRnVuY3Rpb24gPSBsbG1FdmFsQ2xlYW51cEZ1bmN0aW9uO1xuXG4gICAgICAgIGNvbnN0IHNwbGl0VGVzdENhc2VzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ1NwbGl0IFRlc3QgQ2FzZXMnLCB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5zcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbixcbiAgICAgICAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGV2YWx1YXRlVGVzdENhc2VzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0V2YWx1YXRlIFRlc3QgQ2FzZXMnLCB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5sbG1FdmFsRnVuY3Rpb24sXG4gICAgICAgICAgICAvLyBwYXlsb2FkOiBzdGVwZnVuY3Rpb25zLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgICAgIC8vICAgICAnY2h1bmtfa2V5LiQnOiAnJCcsXG4gICAgICAgICAgICAvLyAgICAgJ2V2YWx1YXRpb25faWQuJCc6ICckLmV2YWx1YXRpb25faWQnLFxuICAgICAgICAgICAgLy8gfSksXG4gICAgICAgICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBjb25zdCBwcm9jZXNzVGVzdENhc2VzTWFwID0gbmV3IHN0ZXBmdW5jdGlvbnMuTWFwKHRoaXMsICdQcm9jZXNzIFRlc3QgQ2FzZXMnLCB7XG4gICAgICAgICAgICBpdGVtc1BhdGg6ICckLmNodW5rX2tleXMnLFxuICAgICAgICAgICAgbWF4Q29uY3VycmVuY3k6IDUsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5wYXJ0aWFsX3Jlc3VsdF9rZXlzJyxcbiAgICAgICAgICAgIGl0ZW1TZWxlY3Rvcjoge1xuICAgICAgICAgICAgICAgICdjaHVua19rZXkuJCc6ICckJC5NYXAuSXRlbS5WYWx1ZS5jaHVua19rZXknLFxuICAgICAgICAgICAgICAgICdldmFsdWF0aW9uX2lkLiQnOiAnJCQuTWFwLkl0ZW0uVmFsdWUuZXZhbHVhdGlvbl9pZCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzc1Rlc3RDYXNlc01hcC5pdGVtUHJvY2Vzc29yKGV2YWx1YXRlVGVzdENhc2VzVGFzayk7XG4gICAgXG4gICAgICAgIGNvbnN0IGFnZ3JlZ2F0ZVJlc3VsdHNUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnQWdncmVnYXRlIFJlc3VsdHMnLCB7XG4gICAgICAgIGxhbWJkYUZ1bmN0aW9uOiB0aGlzLmFnZ3JlZ2F0ZUV2YWxSZXN1bHRzRnVuY3Rpb24sXG4gICAgICAgIHBheWxvYWQ6IHN0ZXBmdW5jdGlvbnMuVGFza0lucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICAgICAgLy8ncGFydGlhbF9yZXN1bHRzX2xpc3QuJCc6ICckLlByb2Nlc3NlZFJlc3VsdHMnLFxuICAgICAgICAgICAgJ3BhcnRpYWxfcmVzdWx0X2tleXMuJCc6ICckLnBhcnRpYWxfcmVzdWx0X2tleXMnLFxuICAgICAgICAgICAgJ2V2YWx1YXRpb25faWQuJCc6ICckLmV2YWx1YXRpb25faWQnLFxuICAgICAgICAgICAgJ2V2YWx1YXRpb25fbmFtZS4kJzogJyQuZXZhbHVhdGlvbl9uYW1lJyxcbiAgICAgICAgICAgICd0ZXN0X2Nhc2VzX2tleS4kJzogJyQudGVzdF9jYXNlc19rZXknLFxuICAgICAgICB9KSxcbiAgICAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXG4gICAgICAgIH0pO1xuICAgICAgXG4gICAgICAgIGNvbnN0IHNhdmVSZXN1bHRzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ1NhdmUgRXZhbHVhdGlvbiBSZXN1bHRzJywge1xuICAgICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5sbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbixcbiAgICAgICAgcGF5bG9hZDogc3RlcGZ1bmN0aW9ucy5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAnZXZhbHVhdGlvbl9pZC4kJzogJyQuZXZhbHVhdGlvbl9pZCcsXG4gICAgICAgICAgICAnZXZhbHVhdGlvbl9uYW1lLiQnOiAnJC5ldmFsdWF0aW9uX25hbWUnLFxuICAgICAgICAgICAgJ2F2ZXJhZ2Vfc2ltaWxhcml0eS4kJzogJyQuYXZlcmFnZV9zaW1pbGFyaXR5JyxcbiAgICAgICAgICAgICdhdmVyYWdlX3JlbGV2YW5jZS4kJzogJyQuYXZlcmFnZV9yZWxldmFuY2UnLFxuICAgICAgICAgICAgJ2F2ZXJhZ2VfY29ycmVjdG5lc3MuJCc6ICckLmF2ZXJhZ2VfY29ycmVjdG5lc3MnLFxuICAgICAgICAgICAgJ3RvdGFsX3F1ZXN0aW9ucy4kJzogJyQudG90YWxfcXVlc3Rpb25zJyxcbiAgICAgICAgICAgICdkZXRhaWxlZF9yZXN1bHRzX3MzX2tleS4kJzogJyQuZGV0YWlsZWRfcmVzdWx0c19zM19rZXknLFxuICAgICAgICAgICAgLy8gJ2RldGFpbGVkX3Jlc3VsdHMuJCc6ICckLmRldGFpbGVkX3Jlc3VsdHMnLFxuICAgICAgICAgICAgJ3Rlc3RfY2FzZXNfa2V5LiQnOiAnJC50ZXN0X2Nhc2VzX2tleScsXG4gICAgICAgIH0pLFxuICAgICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY2xlYW51cENodW5rc1Rhc2sgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdDbGVhbnVwIENodW5rcycsIHtcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiB0aGlzLmxsbUV2YWxDbGVhbnVwRnVuY3Rpb24sXG4gICAgICAgICAgICBwYXlsb2FkOiBzdGVwZnVuY3Rpb25zLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgICAgICAgICAnYm9keS4kJzogJyQuYm9keScsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxuICAgICAgICB9KTtcbiAgICAgIFxuICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gc3BsaXRUZXN0Q2FzZXNUYXNrXG4gICAgICAgIC5uZXh0KHByb2Nlc3NUZXN0Q2FzZXNNYXApXG4gICAgICAgIC5uZXh0KGFnZ3JlZ2F0ZVJlc3VsdHNUYXNrKVxuICAgICAgICAubmV4dChzYXZlUmVzdWx0c1Rhc2spXG4gICAgICAgIC5uZXh0KGNsZWFudXBDaHVua3NUYXNrKTtcblxuICAgICAgICBjb25zdCBsbG1FdmFsU3RhdGVNYWNoaW5lID0gbmV3IHN0ZXBmdW5jdGlvbnMuU3RhdGVNYWNoaW5lKHRoaXMsICdFdmFsdWF0aW9uU3RhdGVNYWNoaW5lJywge1xuICAgICAgICAgICAgZGVmaW5pdGlvbkJvZHk6IHN0ZXBmdW5jdGlvbnMuRGVmaW5pdGlvbkJvZHkuZnJvbUNoYWluYWJsZShkZWZpbml0aW9uKSxcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGxtRXZhbFN0YXRlTWFjaGluZSA9IGxsbUV2YWxTdGF0ZU1hY2hpbmU7XG5cbiAgICAgICAgY29uc3Qgc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbicsIHtcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9zdGFydC1sbG0tZXZhbCcpKSwgXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICBcIlNUQVRFX01BQ0hJTkVfQVJOXCIgOiB0aGlzLmxsbUV2YWxTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgICAgIH0pO1xuICAgICAgICBzdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgYWN0aW9uczogWydzdGF0ZXM6U3RhcnRFeGVjdXRpb24nXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW3RoaXMubGxtRXZhbFN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm5dLCBcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uID0gc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb247XG4gICAgfVxufSJdfQ==