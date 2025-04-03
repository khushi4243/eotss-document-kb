"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSearchStack = void 0;
const cdk = require("aws-cdk-lib");
const path = require("path");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const cr = require("aws-cdk-lib/custom-resources");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constants_1 = require("../../constants");
class OpenSearchStack extends cdk.Stack {
    // public readonly indexTrigger : triggers.Trigger;
    constructor(scope, id, props) {
        super(scope, id);
        this.collectionName = `${constants_1.stackName.toLowerCase()}-oss-collection`;
        const openSearchCollection = new aws_cdk_lib_1.aws_opensearchserverless.CfnCollection(scope, 'OpenSearchCollection', {
            name: this.collectionName,
            description: `OpenSearch Serverless Collection for ${constants_1.stackName}`,
            standbyReplicas: 'DISABLED',
            type: 'VECTORSEARCH',
        });
        // create encryption policy first
        const encPolicy = new aws_cdk_lib_1.aws_opensearchserverless.CfnSecurityPolicy(scope, 'OSSEncryptionPolicy', {
            name: `${constants_1.stackName.toLowerCase().slice(0, 10)}-oss-enc-policy`,
            policy: `{"Rules":[{"ResourceType":"collection","Resource":["collection/${this.collectionName}"]}],"AWSOwnedKey":true}`,
            type: 'encryption'
        });
        // also network policy
        const networkPolicy = new aws_cdk_lib_1.aws_opensearchserverless.CfnSecurityPolicy(scope, "OSSNetworkPolicy", {
            name: `${constants_1.stackName.toLowerCase().slice(0, 10)}-oss-network-policy`,
            type: "network",
            policy: `[{"Rules":[{"ResourceType":"dashboard","Resource":["collection/${this.collectionName}"]},{"ResourceType":"collection","Resource":["collection/${this.collectionName}"]}],"AllowFromPublic":true}]`,
        });
        const indexFunctionRole = new iam.Role(scope, 'IndexFunctionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
            ]
        });
        const knowledgeBaseRole = new iam.Role(scope, "KnowledgeBaseRole", {
            assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
        });
        this.knowledgeBaseRole = knowledgeBaseRole;
        const accessPolicy = new aws_cdk_lib_1.aws_opensearchserverless.CfnAccessPolicy(scope, "OSSAccessPolicy", {
            name: `${constants_1.stackName.toLowerCase().slice(0, 10)}-oss-access-policy`,
            type: "data",
            policy: JSON.stringify([
                {
                    "Rules": [
                        {
                            "ResourceType": "index",
                            "Resource": [
                                `index/${this.collectionName}/*`,
                            ],
                            "Permission": [
                                "aoss:UpdateIndex",
                                "aoss:DescribeIndex",
                                "aoss:ReadDocument",
                                "aoss:WriteDocument",
                                "aoss:CreateIndex",
                            ],
                        },
                        {
                            "ResourceType": "collection",
                            "Resource": [
                                `collection/${this.collectionName}`,
                            ],
                            "Permission": [
                                "aoss:DescribeCollectionItems",
                                "aoss:CreateCollectionItems",
                                "aoss:UpdateCollectionItems",
                            ],
                        },
                    ],
                    "Principal": [indexFunctionRole.roleArn, new iam.AccountPrincipal(this.account).arn, knowledgeBaseRole.roleArn]
                }
            ])
        });
        openSearchCollection.addDependency(encPolicy);
        openSearchCollection.addDependency(networkPolicy);
        openSearchCollection.addDependency(accessPolicy);
        this.openSearchCollection = openSearchCollection;
        const openSearchCreateIndexFunction = new lambda.Function(scope, 'OpenSearchCreateIndexFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'create-index-lambda'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ],
                },
            }),
            handler: 'lambda_function.lambda_handler',
            role: indexFunctionRole,
            environment: {
                COLLECTION_ENDPOINT: `${openSearchCollection.attrId}.${cdk.Stack.of(this).region}.aoss.amazonaws.com`,
                INDEX_NAME: `knowledge-base-index`,
                EMBEDDING_DIM: "1024",
                REGION: cdk.Stack.of(this).region
            },
            timeout: cdk.Duration.seconds(120)
        });
        indexFunctionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'aoss:*'
            ],
            resources: [`arn:aws:aoss:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:collection/${openSearchCollection.attrId}`]
        }));
        const lambdaProvider = new cr.Provider(scope, "CreateIndexFunctionCustomProvider", {
            onEventHandler: openSearchCreateIndexFunction
            // on_event_handler=create_index_function,
        });
        const lambdaCustomResource = new cdk.CustomResource(scope, "CreateIndexFunctionCustomResource", {
            serviceToken: lambdaProvider.serviceToken,
        });
        this.lambdaCustomResource = lambdaCustomResource;
    }
}
exports.OpenSearchStack = OpenSearchStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbnNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9wZW5zZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQUM3QixpREFBaUQ7QUFDakQsMkNBQTJDO0FBQzNDLG1EQUFrRDtBQUdsRCw2Q0FBK0U7QUFDL0UsK0NBQTJDO0FBTTNDLE1BQWEsZUFBZ0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQU01QyxtREFBbUQ7SUFFbkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUNuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxxQkFBUyxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQTtRQUNqRSxNQUFNLG9CQUFvQixHQUFHLElBQUksc0NBQW9CLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxzQkFBc0IsRUFBRTtZQUNqRyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDekIsV0FBVyxFQUFFLHdDQUF3QyxxQkFBUyxFQUFFO1lBQ2hFLGVBQWUsRUFBRSxVQUFVO1lBQzNCLElBQUksRUFBRSxjQUFjO1NBQ3JCLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLHNDQUFvQixDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxxQkFBcUIsRUFBRTtZQUN6RixJQUFJLEVBQUUsR0FBRyxxQkFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLGlCQUFpQjtZQUM3RCxNQUFNLEVBQUUsa0VBQWtFLElBQUksQ0FBQyxjQUFjLDBCQUEwQjtZQUN2SCxJQUFJLEVBQUUsWUFBWTtTQUNuQixDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxzQ0FBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFL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QUFZLEVBQUcsY0FBYyxDQUFDLFlBQVk7U0FDM0MsQ0FDSixDQUFBO1FBRUgsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO0lBRXJELENBQUM7Q0FDRjtBQTFJRCwwQ0EwSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGNyIGZyb20gJ2F3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXMnXG5cbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBhd3Nfb3BlbnNlYXJjaHNlcnZlcmxlc3MgYXMgb3BlbnNlYXJjaHNlcnZlcmxlc3MgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBzdGFja05hbWUgfSBmcm9tIFwiLi4vLi4vY29uc3RhbnRzXCJcblxuZXhwb3J0IGludGVyZmFjZSBPcGVuU2VhcmNoU3RhY2tQcm9wcyB7XG4gIFxufVxuXG5leHBvcnQgY2xhc3MgT3BlblNlYXJjaFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcblxuICBwdWJsaWMgcmVhZG9ubHkgb3BlblNlYXJjaENvbGxlY3Rpb24gOiBvcGVuc2VhcmNoc2VydmVybGVzcy5DZm5Db2xsZWN0aW9uOyAgXG4gIHB1YmxpYyByZWFkb25seSBjb2xsZWN0aW9uTmFtZSA6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IGtub3dsZWRnZUJhc2VSb2xlIDogaWFtLlJvbGU7ICBcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYUN1c3RvbVJlc291cmNlIDogY2RrLkN1c3RvbVJlc291cmNlO1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgaW5kZXhUcmlnZ2VyIDogdHJpZ2dlcnMuVHJpZ2dlcjtcbiAgXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBPcGVuU2VhcmNoU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gYCR7c3RhY2tOYW1lLnRvTG93ZXJDYXNlKCl9LW9zcy1jb2xsZWN0aW9uYFxuICAgIGNvbnN0IG9wZW5TZWFyY2hDb2xsZWN0aW9uID0gbmV3IG9wZW5zZWFyY2hzZXJ2ZXJsZXNzLkNmbkNvbGxlY3Rpb24oc2NvcGUsICdPcGVuU2VhcmNoQ29sbGVjdGlvbicsIHtcbiAgICAgIG5hbWU6IHRoaXMuY29sbGVjdGlvbk5hbWUsICAgICAgXG4gICAgICBkZXNjcmlwdGlvbjogYE9wZW5TZWFyY2ggU2VydmVybGVzcyBDb2xsZWN0aW9uIGZvciAke3N0YWNrTmFtZX1gLFxuICAgICAgc3RhbmRieVJlcGxpY2FzOiAnRElTQUJMRUQnLCAgICAgIFxuICAgICAgdHlwZTogJ1ZFQ1RPUlNFQVJDSCcsXG4gICAgfSk7XG5cbiAgICAvLyBjcmVhdGUgZW5jcnlwdGlvbiBwb2xpY3kgZmlyc3RcbiAgICBjb25zdCBlbmNQb2xpY3kgPSBuZXcgb3BlbnNlYXJjaHNlcnZlcmxlc3MuQ2ZuU2VjdXJpdHlQb2xpY3koc2NvcGUsICdPU1NFbmNyeXB0aW9uUG9saWN5Jywge1xuICAgICAgbmFtZTogYCR7c3RhY2tOYW1lLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwxMCl9LW9zcy1lbmMtcG9saWN5YCxcbiAgICAgIHBvbGljeTogYHtcIlJ1bGVzXCI6W3tcIlJlc291cmNlVHlwZVwiOlwiY29sbGVjdGlvblwiLFwiUmVzb3VyY2VcIjpbXCJjb2xsZWN0aW9uLyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1cIl19XSxcIkFXU093bmVkS2V5XCI6dHJ1ZX1gLFxuICAgICAgdHlwZTogJ2VuY3J5cHRpb24nXG4gICAgfSk7ICAgIFxuXG4gICAgLy8gYWxzbyBuZXR3b3JrIHBvbGljeVxuICAgIGNvbnN0IG5ldHdvcmtQb2xpY3kgPSBuZXcgb3BlbnNlYXJjaHNlcnZlcmxlc3MuQ2ZuU2VjdXJpdHlQb2xpY3koc2NvcGUsIFwiT1NTTmV0d29ya1BvbGljeVwiLCB7XG4gICAgICBuYW1lOiBgJHtzdGFja05hbWUudG9Mb3dlckNhc2UoKS5zbGljZSgwLDEwKX0tb3NzLW5ldHdvcmstcG9saWN5YCxcbiAgICAgIHR5cGUgOiBcIm5ldHdvcmtcIixcbiAgICAgIHBvbGljeSA6IGBbe1wiUnVsZXNcIjpbe1wiUmVzb3VyY2VUeXBlXCI6XCJkYXNoYm9hcmRcIixcIlJlc291cmNlXCI6W1wiY29sbGVjdGlvbi8ke3RoaXMuY29sbGVjdGlvbk5hbWV9XCJdfSx7XCJSZXNvdXJjZVR5cGVcIjpcImNvbGxlY3Rpb25cIixcIlJlc291cmNlXCI6W1wiY29sbGVjdGlvbi8ke3RoaXMuY29sbGVjdGlvbk5hbWV9XCJdfV0sXCJBbGxvd0Zyb21QdWJsaWNcIjp0cnVlfV1gLFxuICAgIH0pXG5cbiAgICBjb25zdCBpbmRleEZ1bmN0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZShzY29wZSwgJ0luZGV4RnVuY3Rpb25Sb2xlJywgeyAgICAgIFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFsgICAgICAgIFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIpXG4gICAgICBdXG4gICAgfSk7ICAgIFxuXG4gICAgY29uc3Qga25vd2xlZGdlQmFzZVJvbGUgPSBuZXcgaWFtLlJvbGUoc2NvcGUsIFwiS25vd2xlZGdlQmFzZVJvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2JlZHJvY2suYW1hem9uYXdzLmNvbScpLCAgICAgIFxuICAgIH0pXG5cbiAgICB0aGlzLmtub3dsZWRnZUJhc2VSb2xlID0ga25vd2xlZGdlQmFzZVJvbGU7XG5cbiAgICBjb25zdCBhY2Nlc3NQb2xpY3kgPSBuZXcgb3BlbnNlYXJjaHNlcnZlcmxlc3MuQ2ZuQWNjZXNzUG9saWN5KHNjb3BlLCBcIk9TU0FjY2Vzc1BvbGljeVwiLCB7XG4gICAgICBuYW1lOiBgJHtzdGFja05hbWUudG9Mb3dlckNhc2UoKS5zbGljZSgwLDEwKX0tb3NzLWFjY2Vzcy1wb2xpY3lgLFxuICAgICAgdHlwZTogXCJkYXRhXCIsXG4gICAgICBwb2xpY3kgOiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiUnVsZXNcIjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvdXJjZVR5cGVcIjogXCJpbmRleFwiLFxuICAgICAgICAgICAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGBpbmRleC8ke3RoaXMuY29sbGVjdGlvbk5hbWV9LypgLFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBcIlBlcm1pc3Npb25cIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJhb3NzOlVwZGF0ZUluZGV4XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFvc3M6RGVzY3JpYmVJbmRleFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhb3NzOlJlYWREb2N1bWVudFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhb3NzOldyaXRlRG9jdW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYW9zczpDcmVhdGVJbmRleFwiLFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIlJlc291cmNlVHlwZVwiOiBcImNvbGxlY3Rpb25cIixcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBgY29sbGVjdGlvbi8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXCJQZXJtaXNzaW9uXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYW9zczpEZXNjcmliZUNvbGxlY3Rpb25JdGVtc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhb3NzOkNyZWF0ZUNvbGxlY3Rpb25JdGVtc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhb3NzOlVwZGF0ZUNvbGxlY3Rpb25JdGVtc1wiLFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJQcmluY2lwYWxcIjogW2luZGV4RnVuY3Rpb25Sb2xlLnJvbGVBcm4sbmV3IGlhbS5BY2NvdW50UHJpbmNpcGFsKHRoaXMuYWNjb3VudCkuYXJuLGtub3dsZWRnZUJhc2VSb2xlLnJvbGVBcm5dXG4gICAgICAgIH1cbiAgICBdKVxuICAgIH0pXG5cbiAgICBvcGVuU2VhcmNoQ29sbGVjdGlvbi5hZGREZXBlbmRlbmN5KGVuY1BvbGljeSk7XG4gICAgb3BlblNlYXJjaENvbGxlY3Rpb24uYWRkRGVwZW5kZW5jeShuZXR3b3JrUG9saWN5KTtcbiAgICBvcGVuU2VhcmNoQ29sbGVjdGlvbi5hZGREZXBlbmRlbmN5KGFjY2Vzc1BvbGljeSk7XG5cbiAgICB0aGlzLm9wZW5TZWFyY2hDb2xsZWN0aW9uID0gb3BlblNlYXJjaENvbGxlY3Rpb247XG5cbiAgICBjb25zdCBvcGVuU2VhcmNoQ3JlYXRlSW5kZXhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdPcGVuU2VhcmNoQ3JlYXRlSW5kZXhGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnY3JlYXRlLWluZGV4LWxhbWJkYScpLFxuICAgICAgICB7XG4gICAgICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgICAgIGltYWdlOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMi5idW5kbGluZ0ltYWdlLFxuICAgICAgICAgICAgY29tbWFuZDogW1xuICAgICAgICAgICAgICAnYmFzaCcsICctYycsXG4gICAgICAgICAgICAgICdwaXAgaW5zdGFsbCAtciByZXF1aXJlbWVudHMudHh0IC10IC9hc3NldC1vdXRwdXQgJiYgY3AgLWF1IC4gL2Fzc2V0LW91dHB1dCdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksIFxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxuICAgICAgcm9sZTogaW5kZXhGdW5jdGlvblJvbGUsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDT0xMRUNUSU9OX0VORFBPSU5UIDogYCR7b3BlblNlYXJjaENvbGxlY3Rpb24uYXR0cklkfS4ke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259LmFvc3MuYW1hem9uYXdzLmNvbWAsXG4gICAgICAgIElOREVYX05BTUUgOiBga25vd2xlZGdlLWJhc2UtaW5kZXhgLFxuICAgICAgICBFTUJFRERJTkdfRElNIDogXCIxMDI0XCIsXG4gICAgICAgIFJFR0lPTiA6IGNkay5TdGFjay5vZih0aGlzKS5yZWdpb25cbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMjApXG4gICAgfSk7XG5cbiAgICBpbmRleEZ1bmN0aW9uUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdhb3NzOionXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6YW9zczoke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259OiR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9OmNvbGxlY3Rpb24vJHtvcGVuU2VhcmNoQ29sbGVjdGlvbi5hdHRySWR9YF1cbiAgICB9KSk7XG5cbiAgICBcbiAgICBjb25zdCBsYW1iZGFQcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcihcbiAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgXCJDcmVhdGVJbmRleEZ1bmN0aW9uQ3VzdG9tUHJvdmlkZXJcIix7XG4gICAgICAgICAgICAgIG9uRXZlbnRIYW5kbGVyIDogb3BlblNlYXJjaENyZWF0ZUluZGV4RnVuY3Rpb25cbiAgICAgICAgICAgIC8vIG9uX2V2ZW50X2hhbmRsZXI9Y3JlYXRlX2luZGV4X2Z1bmN0aW9uLFxuICAgICAgICAgICAgfVxuICAgICAgICApXG5cbiAgICAgIGNvbnN0IGxhbWJkYUN1c3RvbVJlc291cmNlID0gbmV3IGNkay5DdXN0b21SZXNvdXJjZShcbiAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgXCJDcmVhdGVJbmRleEZ1bmN0aW9uQ3VzdG9tUmVzb3VyY2VcIix7XG4gICAgICAgICAgICAgIHNlcnZpY2VUb2tlbiA6IGxhbWJkYVByb3ZpZGVyLnNlcnZpY2VUb2tlbixcbiAgICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgXG4gICAgICB0aGlzLmxhbWJkYUN1c3RvbVJlc291cmNlID0gbGFtYmRhQ3VzdG9tUmVzb3VyY2U7XG5cbiAgfSAgXG59Il19