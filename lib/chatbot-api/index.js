"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotApi = void 0;
const cdk = require("aws-cdk-lib");
const websocket_api_1 = require("./gateway/websocket-api");
const rest_api_1 = require("./gateway/rest-api");
const functions_1 = require("./functions/functions");
const tables_1 = require("./tables/tables");
const buckets_1 = require("./buckets/buckets");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_integrations_2 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_authorizers_1 = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const opensearch_1 = require("./opensearch/opensearch");
const knowledge_base_1 = require("./knowledge-base/knowledge-base");
class ChatBotApi extends constructs_1.Construct {
    // public readonly byUserIdIndex: string;
    // public readonly filesBucket: s3.Bucket;
    // public readonly userFeedbackBucket: s3.Bucket;
    // public readonly wsAPI: apigwv2.WebSocketApi;
    constructor(scope, id, props) {
        super(scope, id);
        const tables = new tables_1.TableStack(this, "TableStack");
        const buckets = new buckets_1.S3BucketStack(this, "BucketStack");
        const openSearch = new opensearch_1.OpenSearchStack(this, "OpenSearchStack", {});
        const knowledgeBase = new knowledge_base_1.KnowledgeBaseStack(this, "KnowledgeBaseStack", { openSearch: openSearch,
            s3bucket: buckets.knowledgeBucket });
        const restBackend = new rest_api_1.RestBackendAPI(this, "RestBackend", {});
        this.httpAPI = restBackend;
        const websocketBackend = new websocket_api_1.WebsocketBackendAPI(this, "WebsocketBackend", {});
        this.wsAPI = websocketBackend;
        const lambdaFunctions = new functions_1.LambdaFunctionStack(this, "LambdaFunctions", {
            wsApiEndpoint: websocketBackend.wsAPIStage.url,
            sessionTable: tables.historyTable,
            feedbackTable: tables.feedbackTable,
            feedbackBucket: buckets.feedbackBucket,
            knowledgeBucket: buckets.knowledgeBucket,
            knowledgeBase: knowledgeBase.knowledgeBase,
            knowledgeBaseSource: knowledgeBase.dataSource,
            evalSummariesTable: tables.evalSummaryTable,
            evalResutlsTable: tables.evalResultsTable,
            evalTestCasesBucket: buckets.evalTestCasesBucket,
            stagedSystemPromptsTable: tables.stagedSystemPromptsTable,
            activeSystemPromptsTable: tables.activeSystemPromptsTable,
        });
        const wsAuthorizer = new aws_apigatewayv2_authorizers_1.WebSocketLambdaAuthorizer('WebSocketAuthorizer', props.authentication.lambdaAuthorizer, { identitySource: ['route.request.querystring.Authorization'] });
        websocketBackend.wsAPI.addRoute('getChatbotResponse', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotResponseIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$connect', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
            authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$default', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$disconnect', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotDisconnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('generateConflictReport', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotDisconnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.grantManageConnections(lambdaFunctions.chatFunction);
        const httpAuthorizer = new aws_apigatewayv2_authorizers_1.HttpJwtAuthorizer('HTTPAuthorizer', props.authentication.userPool.userPoolProviderUrl, {
            jwtAudience: [props.authentication.userPoolClient.userPoolClientId],
        });
        const sessionAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('SessionAPIIntegration', lambdaFunctions.sessionFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-session",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: sessionAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // SESSION_HANDLER
        // lambdaFunctions.chatFunction.addEnvironment(
        //   "mvp_user_session_handler_api_gateway_endpoint", restBackend.restAPI.apiEndpoint + "/user-session")
        lambdaFunctions.chatFunction.addEnvironment("SESSION_HANDLER", lambdaFunctions.sessionFunction.functionName);
        const feedbackAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('FeedbackAPIIntegration', lambdaFunctions.feedbackFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-feedback",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: feedbackAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const feedbackAPIDownloadIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('FeedbackDownloadAPIIntegration', lambdaFunctions.feedbackFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-feedback/download-feedback",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: feedbackAPIDownloadIntegration,
            authorizer: httpAuthorizer,
        });
        const s3GetKnowledgeAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3GetKnowledgeAPIIntegration', lambdaFunctions.getS3KnowledgeFunction);
        restBackend.restAPI.addRoutes({
            path: "/s3-knowledge-bucket-data",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3GetKnowledgeAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3GetTestCasesAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3GetTestCasesAPIIntegration', lambdaFunctions.getS3TestCasesFunction);
        restBackend.restAPI.addRoutes({
            path: "/s3-test-cases-bucket-data",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3GetTestCasesAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3DeleteAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3DeleteAPIIntegration', lambdaFunctions.deleteS3Function);
        restBackend.restAPI.addRoutes({
            path: "/delete-s3-file",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3DeleteAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3UploadKnowledgeAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3UploadKnowledgeAPIIntegration', lambdaFunctions.uploadS3KnowledgeFunction);
        restBackend.restAPI.addRoutes({
            path: "/signed-url-knowledge",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3UploadKnowledgeAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kbSyncProgressAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KBSyncAPIIntegration', lambdaFunctions.syncKBFunction);
        restBackend.restAPI.addRoutes({
            path: "/kb-sync/still-syncing",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kbSyncProgressAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kbSyncAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KBSyncAPIIntegration', lambdaFunctions.syncKBFunction);
        restBackend.restAPI.addRoutes({
            path: "/kb-sync/sync-kb",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kbSyncAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kbLastSyncAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KBLastSyncAPIIntegration', lambdaFunctions.syncKBFunction);
        restBackend.restAPI.addRoutes({
            path: "/kb-sync/get-last-sync",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kbLastSyncAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const evalResultsHandlerIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('EvalResultsHandlerIntegration', lambdaFunctions.handleEvalResultsFunction);
        restBackend.restAPI.addRoutes({
            path: "/eval-results-handler",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: evalResultsHandlerIntegration,
            authorizer: httpAuthorizer,
        });
        const evalRunHandlerIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('EvalRunHandlerIntegration', lambdaFunctions.stepFunctionsStack.startLlmEvalStateMachineFunction);
        restBackend.restAPI.addRoutes({
            path: "/eval-run-handler",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: evalRunHandlerIntegration,
            authorizer: httpAuthorizer,
        });
        const s3UploadTestCasesAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3UploadTestCasesAPIIntegration', lambdaFunctions.uploadS3TestCasesFunction);
        restBackend.restAPI.addRoutes({
            path: "/signed-url-test-cases",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3UploadTestCasesAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const systemPromptsAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('SystemPromptsAPIIntegration', lambdaFunctions.systemPromptsFunction);
        restBackend.restAPI.addRoutes({
            path: "/system-prompts-handler",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: systemPromptsAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // this.wsAPI = websocketBackend.wsAPI;
        // const api = new appsync.GraphqlApi(this, "ChatbotApi", {
        //   name: "ChatbotGraphqlApi",
        //   definition: appsync.Definition.fromFile(
        //     path.join(__dirname, "schema/schema.graphql")
        //   ),
        //   authorizationConfig: {
        //     additionalAuthorizationModes: [
        //       {
        //         authorizationType: appsync.AuthorizationType.IAM,
        //       },
        //       {
        //         authorizationType: appsync.AuthorizationType.USER_POOL,
        //         userPoolConfig: {
        //           userPool: props.userPool,
        //         },
        //       },
        //     ],
        //   },
        //   logConfig: {
        //     fieldLogLevel: appsync.FieldLogLevel.ALL,
        //     retention: RetentionDays.ONE_WEEK,
        //     role: loggingRole,
        //   },
        //   xrayEnabled: true,
        //   visibility: props.config.privateWebsite ? appsync.Visibility.PRIVATE : appsync.Visibility.GLOBAL
        // });
        // new ApiResolvers(this, "RestApi", {
        //   ...props,
        //   sessionsTable: chatTables.sessionsTable,
        //   byUserIdIndex: chatTables.byUserIdIndex,
        //   api,
        //   userFeedbackBucket: chatBuckets.userFeedbackBucket,
        // });
        // const realtimeBackend = new RealtimeGraphqlApiBackend(this, "Realtime", {
        //   ...props,
        //   api,
        // });
        // realtimeBackend.resolvers.outgoingMessageHandler.addEnvironment(
        //   "GRAPHQL_ENDPOINT",
        //   api.graphqlUrl
        // );
        // api.grantMutation(realtimeBackend.resolvers.outgoingMessageHandler);
        // // Prints out URL
        // new cdk.CfnOutput(this, "GraphqlAPIURL", {
        //   value: api.graphqlUrl,
        // });
        // // Prints out the AppSync GraphQL API key to the terminal
        new cdk.CfnOutput(this, "WS-API - apiEndpoint", {
            value: websocketBackend.wsAPI.apiEndpoint || "",
        });
        new cdk.CfnOutput(this, "HTTP-API - apiEndpoint", {
            value: restBackend.restAPI.apiEndpoint || "",
        });
        // this.messagesTopic = realtimeBackend.messagesTopic;
        // this.sessionsTable = chatTables.sessionsTable;
        // this.byUserIdIndex = chatTables.byUserIdIndex;
        // this.userFeedbackBucket = chatBuckets.userFeedbackBucket;
        // this.filesBucket = chatBuckets.filesBucket;
        // this.graphqlApi = api;
        /**
         * CDK NAG suppression
         */
        // NagSuppressions.addResourceSuppressions(loggingRole, [
        //   {
        //     id: "AwsSolutions-IAM5",
        //     reason:
        //       "Access to all log groups required for CloudWatch log group creation.",
        //   },
        // ]);
    }
}
exports.ChatBotApi = ChatBotApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtQ0FBbUM7QUFJbkMsMkRBQTZEO0FBQzdELGlEQUFtRDtBQUNuRCxxREFBMkQ7QUFDM0QsNENBQTRDO0FBQzVDLCtDQUFpRDtBQUVqRCw2RkFBdUY7QUFDdkYsNkZBQWtGO0FBQ2xGLDJGQUFpSTtBQUNqSSw2Q0FBMEQ7QUFDMUQsMkNBQXVDO0FBQ3ZDLHdEQUEwRDtBQUMxRCxvRUFBb0U7QUFRcEUsTUFBYSxVQUFXLFNBQVEsc0JBQVM7SUFHdkMseUNBQXlDO0lBQ3pDLDBDQUEwQztJQUMxQyxpREFBaUQ7SUFDakQsK0NBQStDO0lBRS9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksdUJBQWEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFdkQsTUFBTSxVQUFVLEdBQUcsSUFBSSw0QkFBZSxDQUFDLElBQUksRUFBQyxpQkFBaUIsRUFBQyxFQUFFLENBQUMsQ0FBQTtRQUNqRSxNQUFNLGFBQWEsR0FBRyxJQUFJLG1DQUFrQixDQUFDLElBQUksRUFBQyxvQkFBb0IsRUFBQyxFQUFFLFVBQVUsRUFBRyxVQUFVO1lBQzlGLFFBQVEsRUFBRyxPQUFPLENBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQTtRQUV0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFjLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQztRQUMzQixNQUFNLGdCQUFnQixHQUFHLElBQUksbUNBQW1CLENBQUMsSUFBSSxF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RUc7UUFDSCx5REFBeUQ7UUFDekQsTUFBTTtRQUNOLCtCQUErQjtRQUMvQixjQUFjO1FBQ2QsZ0ZBQWdGO1FBQ2hGLE9BQU87UUFDUCxNQUFNO0lBQ1IsQ0FBQztDQUNGO0FBeFJELGdDQXdSQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG5pbXBvcnQgeyBBdXRob3JpemF0aW9uU3RhY2sgfSBmcm9tICcuLi9hdXRob3JpemF0aW9uJ1xuXG5pbXBvcnQgeyBXZWJzb2NrZXRCYWNrZW5kQVBJIH0gZnJvbSBcIi4vZ2F0ZXdheS93ZWJzb2NrZXQtYXBpXCJcbmltcG9ydCB7IFJlc3RCYWNrZW5kQVBJIH0gZnJvbSBcIi4vZ2F0ZXdheS9yZXN0LWFwaVwiXG5pbXBvcnQgeyBMYW1iZGFGdW5jdGlvblN0YWNrIH0gZnJvbSBcIi4vZnVuY3Rpb25zL2Z1bmN0aW9uc1wiXG5pbXBvcnQgeyBUYWJsZVN0YWNrIH0gZnJvbSBcIi4vdGFibGVzL3RhYmxlc1wiXG5pbXBvcnQgeyBTM0J1Y2tldFN0YWNrIH0gZnJvbSBcIi4vYnVja2V0cy9idWNrZXRzXCJcblxuaW1wb3J0IHsgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgeyBXZWJTb2NrZXRMYW1iZGFBdXRob3JpemVyLCBIdHRwVXNlclBvb2xBdXRob3JpemVyLCBIdHRwSnd0QXV0aG9yaXplciAgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcbmltcG9ydCB7IGF3c19hcGlnYXRld2F5djIgYXMgYXBpZ3d2MiB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IE9wZW5TZWFyY2hTdGFjayB9IGZyb20gXCIuL29wZW5zZWFyY2gvb3BlbnNlYXJjaFwiO1xuaW1wb3J0IHsgS25vd2xlZGdlQmFzZVN0YWNrIH0gZnJvbSBcIi4va25vd2xlZGdlLWJhc2Uva25vd2xlZGdlLWJhc2VcIlxuXG4vLyBpbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIENoYXRCb3RBcGlQcm9wcyB7XG4gIHJlYWRvbmx5IGF1dGhlbnRpY2F0aW9uOiBBdXRob3JpemF0aW9uU3RhY2s7IFxufVxuXG5leHBvcnQgY2xhc3MgQ2hhdEJvdEFwaSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBodHRwQVBJOiBSZXN0QmFja2VuZEFQSTtcbiAgcHVibGljIHJlYWRvbmx5IHdzQVBJOiBXZWJzb2NrZXRCYWNrZW5kQVBJO1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgYnlVc2VySWRJbmRleDogc3RyaW5nO1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgZmlsZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgLy8gcHVibGljIHJlYWRvbmx5IHVzZXJGZWVkYmFja0J1Y2tldDogczMuQnVja2V0O1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgd3NBUEk6IGFwaWd3djIuV2ViU29ja2V0QXBpO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDaGF0Qm90QXBpUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgdGFibGVzID0gbmV3IFRhYmxlU3RhY2sodGhpcywgXCJUYWJsZVN0YWNrXCIpO1xuICAgIGNvbnN0IGJ1Y2tldHMgPSBuZXcgUzNCdWNrZXRTdGFjayh0aGlzLCBcIkJ1Y2tldFN0YWNrXCIpO1xuICAgIFxuICAgIGNvbnN0IG9wZW5TZWFyY2ggPSBuZXcgT3BlblNlYXJjaFN0YWNrKHRoaXMsXCJPcGVuU2VhcmNoU3RhY2tcIix7fSlcbiAgICBjb25zdCBrbm93bGVkZ2VCYXNlID0gbmV3IEtub3dsZWRnZUJhc2VTdGFjayh0aGlzLFwiS25vd2xlZGdlQmFzZVN0YWNrXCIseyBvcGVuU2VhcmNoIDogb3BlblNlYXJjaCxcbiAgICAgIHMzYnVja2V0IDogYnVja2V0cy5rbm93bGVkZ2VCdWNrZXR9KVxuXG4gICAgY29uc3QgcmVzdEJhY2tlbmQgPSBuZXcgUmVzdEJhY2tlbmRBUEkodGhpcywgXCJSZXN0QmFja2VuZFwiLCB7fSlcbiAgICB0aGlzLmh0dHBBUEkgPSByZXN0QmFja2VuZDtcbiAgICBjb25zdCB3ZWJzb2NrZXRCYWNrZW5kID0gbmV3IFdlYnNvY2tldEJhY2tlbmRBUEkodGhpcywgXCJXZWJzb2NrZXRCYWNrZW5kXCIsIHt9KVxuICAgIHRoaXMud3NBUEkgPSB3ZWJzb2NrZXRCYWNrZW5kO1xuXG4gICAgY29uc3QgbGFtYmRhRnVuY3Rpb25zID0gbmV3IExhbWJkYUZ1bmN0aW9uU3RhY2sodGhpcywgXCJMYW1iZGFGdW5jdGlvbnNcIixcbiAgICAgIHtcbiAgICAgICAgd3NBcGlFbmRwb2ludDogd2Vic29ja2V0QmFja2VuZC53c0FQSVN0YWdlLnVybCxcbiAgICAgICAgc2Vzc2lvblRhYmxlOiB0YWJsZXMuaGlzdG9yeVRhYmxlLCAgICAgICAgXG4gICAgICAgIGZlZWRiYWNrVGFibGU6IHRhYmxlcy5mZWVkYmFja1RhYmxlLFxuICAgICAgICBmZWVkYmFja0J1Y2tldDogYnVja2V0cy5mZWVkYmFja0J1Y2tldCxcbiAgICAgICAga25vd2xlZGdlQnVja2V0OiBidWNrZXRzLmtub3dsZWRnZUJ1Y2tldCxcbiAgICAgICAga25vd2xlZGdlQmFzZToga25vd2xlZGdlQmFzZS5rbm93bGVkZ2VCYXNlLFxuICAgICAgICBrbm93bGVkZ2VCYXNlU291cmNlIDoga25vd2xlZGdlQmFzZS5kYXRhU291cmNlLFxuICAgICAgICBldmFsU3VtbWFyaWVzVGFibGUgOiB0YWJsZXMuZXZhbFN1bW1hcnlUYWJsZSxcbiAgICAgICAgZXZhbFJlc3V0bHNUYWJsZSA6IHRhYmxlcy5ldmFsUmVzdWx0c1RhYmxlLFxuICAgICAgICBldmFsVGVzdENhc2VzQnVja2V0IDogYnVja2V0cy5ldmFsVGVzdENhc2VzQnVja2V0LFxuICAgICAgICBzdGFnZWRTeXN0ZW1Qcm9tcHRzVGFibGUgOiB0YWJsZXMuc3RhZ2VkU3lzdGVtUHJvbXB0c1RhYmxlLFxuICAgICAgICBhY3RpdmVTeXN0ZW1Qcm9tcHRzVGFibGUgOiB0YWJsZXMuYWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlLFxuICAgICAgfSlcblxuICAgIGNvbnN0IHdzQXV0aG9yaXplciA9IG5ldyBXZWJTb2NrZXRMYW1iZGFBdXRob3JpemVyKCdXZWJTb2NrZXRBdXRob3JpemVyJywgcHJvcHMuYXV0aGVudGljYXRpb24ubGFtYmRhQXV0aG9yaXplciwge2lkZW50aXR5U291cmNlOiBbJ3JvdXRlLnJlcXVlc3QucXVlcnlzdHJpbmcuQXV0aG9yaXphdGlvbiddfSk7XG5cbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCdnZXRDaGF0Ym90UmVzcG9uc2UnLCB7XG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90UmVzcG9uc2VJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXG4gICAgfSk7XG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGNvbm5lY3QnLCB7XG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90Q29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXG4gICAgICBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcbiAgICB9KTtcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckZGVmYXVsdCcsIHtcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RDb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxuICAgIH0pO1xuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRkaXNjb25uZWN0Jywge1xuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdERpc2Nvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXG4gICAgfSk7IFxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJ2dlbmVyYXRlQ29uZmxpY3RSZXBvcnQnLCB7XG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90RGlzY29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcbiAgICB9KTsgICAgXG5cbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmdyYW50TWFuYWdlQ29ubmVjdGlvbnMobGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbik7XG5cbiAgICBcbiAgICBjb25zdCBodHRwQXV0aG9yaXplciA9IG5ldyBIdHRwSnd0QXV0aG9yaXplcignSFRUUEF1dGhvcml6ZXInLCBwcm9wcy5hdXRoZW50aWNhdGlvbi51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyVXJsLHtcbiAgICAgIGp3dEF1ZGllbmNlOiBbcHJvcHMuYXV0aGVudGljYXRpb24udXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZF0sXG4gICAgfSlcblxuICAgIGNvbnN0IHNlc3Npb25BUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1Nlc3Npb25BUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3VzZXItc2Vzc2lvblwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcbiAgICAgIGludGVncmF0aW9uOiBzZXNzaW9uQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gU0VTU0lPTl9IQU5ETEVSXG4gICAgLy8gbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbi5hZGRFbnZpcm9ubWVudChcbiAgICAvLyAgIFwibXZwX3VzZXJfc2Vzc2lvbl9oYW5kbGVyX2FwaV9nYXRld2F5X2VuZHBvaW50XCIsIHJlc3RCYWNrZW5kLnJlc3RBUEkuYXBpRW5kcG9pbnQgKyBcIi91c2VyLXNlc3Npb25cIilcbiAgICBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uLmFkZEVudmlyb25tZW50KFxuICAgICAgXCJTRVNTSU9OX0hBTkRMRVJcIiwgbGFtYmRhRnVuY3Rpb25zLnNlc3Npb25GdW5jdGlvbi5mdW5jdGlvbk5hbWUpXG4gICAgXG5cbiAgICBjb25zdCBmZWVkYmFja0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmVlZGJhY2tBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5mZWVkYmFja0Z1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi91c2VyLWZlZWRiYWNrXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3QgZmVlZGJhY2tBUElEb3dubG9hZEludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmVlZGJhY2tEb3dubG9hZEFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmZlZWRiYWNrRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3VzZXItZmVlZGJhY2svZG93bmxvYWQtZmVlZGJhY2tcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogZmVlZGJhY2tBUElEb3dubG9hZEludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IHMzR2V0S25vd2xlZGdlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0dldEtub3dsZWRnZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmdldFMzS25vd2xlZGdlRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3MzLWtub3dsZWRnZS1idWNrZXQtZGF0YVwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBzM0dldEtub3dsZWRnZUFQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IHMzR2V0VGVzdENhc2VzQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0dldFRlc3RDYXNlc0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmdldFMzVGVzdENhc2VzRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3MzLXRlc3QtY2FzZXMtYnVja2V0LWRhdGFcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogczNHZXRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICBjb25zdCBzM0RlbGV0ZUFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNEZWxldGVBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5kZWxldGVTM0Z1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9kZWxldGUtczMtZmlsZVwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBzM0RlbGV0ZUFQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IHMzVXBsb2FkS25vd2xlZGdlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM1VwbG9hZEtub3dsZWRnZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzS25vd2xlZGdlRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3NpZ25lZC11cmwta25vd2xlZGdlXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IHMzVXBsb2FkS25vd2xlZGdlQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3Qga2JTeW5jUHJvZ3Jlc3NBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0tCU3luY0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnN5bmNLQkZ1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9rYi1zeW5jL3N0aWxsLXN5bmNpbmdcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBrYlN5bmNQcm9ncmVzc0FQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IGtiU3luY0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS0JTeW5jQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc3luY0tCRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2tiLXN5bmMvc3luYy1rYlwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGtiU3luY0FQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBcbiAgICBjb25zdCBrYkxhc3RTeW5jQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdLQkxhc3RTeW5jQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc3luY0tCRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2tiLXN5bmMvZ2V0LWxhc3Qtc3luY1wiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGtiTGFzdFN5bmNBUElJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICBjb25zdCBldmFsUmVzdWx0c0hhbmRsZXJJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAnRXZhbFJlc3VsdHNIYW5kbGVySW50ZWdyYXRpb24nLFxuICAgICAgbGFtYmRhRnVuY3Rpb25zLmhhbmRsZUV2YWxSZXN1bHRzRnVuY3Rpb25cbiAgICApO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2V2YWwtcmVzdWx0cy1oYW5kbGVyXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IGV2YWxSZXN1bHRzSGFuZGxlckludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICBjb25zdCBldmFsUnVuSGFuZGxlckludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICdFdmFsUnVuSGFuZGxlckludGVncmF0aW9uJyxcbiAgICAgIGxhbWJkYUZ1bmN0aW9ucy5zdGVwRnVuY3Rpb25zU3RhY2suc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb25cbiAgICApO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2V2YWwtcnVuLWhhbmRsZXJcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogZXZhbFJ1bkhhbmRsZXJJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pOyBcblxuICAgIGNvbnN0IHMzVXBsb2FkVGVzdENhc2VzQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM1VwbG9hZFRlc3RDYXNlc0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3NpZ25lZC11cmwtdGVzdC1jYXNlc1wiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBzM1VwbG9hZFRlc3RDYXNlc0FQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IHN5c3RlbVByb21wdHNBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAnU3lzdGVtUHJvbXB0c0FQSUludGVncmF0aW9uJywgXG4gICAgICBsYW1iZGFGdW5jdGlvbnMuc3lzdGVtUHJvbXB0c0Z1bmN0aW9uXG4gICAgKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9zeXN0ZW0tcHJvbXB0cy1oYW5kbGVyXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IHN5c3RlbVByb21wdHNBUElJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pO1xuXG4gICAgICAvLyB0aGlzLndzQVBJID0gd2Vic29ja2V0QmFja2VuZC53c0FQSTtcblxuXG5cblxuICAgIC8vIGNvbnN0IGFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgXCJDaGF0Ym90QXBpXCIsIHtcbiAgICAvLyAgIG5hbWU6IFwiQ2hhdGJvdEdyYXBocWxBcGlcIixcbiAgICAvLyAgIGRlZmluaXRpb246IGFwcHN5bmMuRGVmaW5pdGlvbi5mcm9tRmlsZShcbiAgICAvLyAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCJzY2hlbWEvc2NoZW1hLmdyYXBocWxcIilcbiAgICAvLyAgICksXG4gICAgLy8gICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgLy8gICAgIGFkZGl0aW9uYWxBdXRob3JpemF0aW9uTW9kZXM6IFtcbiAgICAvLyAgICAgICB7XG4gICAgLy8gICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5JQU0sXG4gICAgLy8gICAgICAgfSxcbiAgICAvLyAgICAgICB7XG4gICAgLy8gICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5VU0VSX1BPT0wsXG4gICAgLy8gICAgICAgICB1c2VyUG9vbENvbmZpZzoge1xuICAgIC8vICAgICAgICAgICB1c2VyUG9vbDogcHJvcHMudXNlclBvb2wsXG4gICAgLy8gICAgICAgICB9LFxuICAgIC8vICAgICAgIH0sXG4gICAgLy8gICAgIF0sXG4gICAgLy8gICB9LFxuICAgIC8vICAgbG9nQ29uZmlnOiB7XG4gICAgLy8gICAgIGZpZWxkTG9nTGV2ZWw6IGFwcHN5bmMuRmllbGRMb2dMZXZlbC5BTEwsXG4gICAgLy8gICAgIHJldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAvLyAgICAgcm9sZTogbG9nZ2luZ1JvbGUsXG4gICAgLy8gICB9LFxuICAgIC8vICAgeHJheUVuYWJsZWQ6IHRydWUsXG4gICAgLy8gICB2aXNpYmlsaXR5OiBwcm9wcy5jb25maWcucHJpdmF0ZVdlYnNpdGUgPyBhcHBzeW5jLlZpc2liaWxpdHkuUFJJVkFURSA6IGFwcHN5bmMuVmlzaWJpbGl0eS5HTE9CQUxcbiAgICAvLyB9KTtcblxuICAgIC8vIG5ldyBBcGlSZXNvbHZlcnModGhpcywgXCJSZXN0QXBpXCIsIHtcbiAgICAvLyAgIC4uLnByb3BzLFxuICAgIC8vICAgc2Vzc2lvbnNUYWJsZTogY2hhdFRhYmxlcy5zZXNzaW9uc1RhYmxlLFxuICAgIC8vICAgYnlVc2VySWRJbmRleDogY2hhdFRhYmxlcy5ieVVzZXJJZEluZGV4LFxuICAgIC8vICAgYXBpLFxuICAgIC8vICAgdXNlckZlZWRiYWNrQnVja2V0OiBjaGF0QnVja2V0cy51c2VyRmVlZGJhY2tCdWNrZXQsXG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCByZWFsdGltZUJhY2tlbmQgPSBuZXcgUmVhbHRpbWVHcmFwaHFsQXBpQmFja2VuZCh0aGlzLCBcIlJlYWx0aW1lXCIsIHtcbiAgICAvLyAgIC4uLnByb3BzLFxuICAgIC8vICAgYXBpLFxuICAgIC8vIH0pO1xuXG4gICAgLy8gcmVhbHRpbWVCYWNrZW5kLnJlc29sdmVycy5vdXRnb2luZ01lc3NhZ2VIYW5kbGVyLmFkZEVudmlyb25tZW50KFxuICAgIC8vICAgXCJHUkFQSFFMX0VORFBPSU5UXCIsXG4gICAgLy8gICBhcGkuZ3JhcGhxbFVybFxuICAgIC8vICk7XG5cbiAgICAvLyBhcGkuZ3JhbnRNdXRhdGlvbihyZWFsdGltZUJhY2tlbmQucmVzb2x2ZXJzLm91dGdvaW5nTWVzc2FnZUhhbmRsZXIpO1xuXG4gICAgLy8gLy8gUHJpbnRzIG91dCBVUkxcbiAgICAvLyBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkdyYXBocWxBUElVUkxcIiwge1xuICAgIC8vICAgdmFsdWU6IGFwaS5ncmFwaHFsVXJsLFxuICAgIC8vIH0pO1xuXG4gICAgLy8gLy8gUHJpbnRzIG91dCB0aGUgQXBwU3luYyBHcmFwaFFMIEFQSSBrZXkgdG8gdGhlIHRlcm1pbmFsXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJXUy1BUEkgLSBhcGlFbmRwb2ludFwiLCB7XG4gICAgICB2YWx1ZTogd2Vic29ja2V0QmFja2VuZC53c0FQSS5hcGlFbmRwb2ludCB8fCBcIlwiLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiSFRUUC1BUEkgLSBhcGlFbmRwb2ludFwiLCB7XG4gICAgICB2YWx1ZTogcmVzdEJhY2tlbmQucmVzdEFQSS5hcGlFbmRwb2ludCB8fCBcIlwiLFxuICAgIH0pO1xuXG4gICAgLy8gdGhpcy5tZXNzYWdlc1RvcGljID0gcmVhbHRpbWVCYWNrZW5kLm1lc3NhZ2VzVG9waWM7XG4gICAgLy8gdGhpcy5zZXNzaW9uc1RhYmxlID0gY2hhdFRhYmxlcy5zZXNzaW9uc1RhYmxlO1xuICAgIC8vIHRoaXMuYnlVc2VySWRJbmRleCA9IGNoYXRUYWJsZXMuYnlVc2VySWRJbmRleDtcbiAgICAvLyB0aGlzLnVzZXJGZWVkYmFja0J1Y2tldCA9IGNoYXRCdWNrZXRzLnVzZXJGZWVkYmFja0J1Y2tldDtcbiAgICAvLyB0aGlzLmZpbGVzQnVja2V0ID0gY2hhdEJ1Y2tldHMuZmlsZXNCdWNrZXQ7XG4gICAgLy8gdGhpcy5ncmFwaHFsQXBpID0gYXBpO1xuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIC8vIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhsb2dnaW5nUm9sZSwgW1xuICAgIC8vICAge1xuICAgIC8vICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgIC8vICAgICByZWFzb246XG4gICAgLy8gICAgICAgXCJBY2Nlc3MgdG8gYWxsIGxvZyBncm91cHMgcmVxdWlyZWQgZm9yIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGNyZWF0aW9uLlwiLFxuICAgIC8vICAgfSxcbiAgICAvLyBdKTtcbiAgfVxufSJdfQ==