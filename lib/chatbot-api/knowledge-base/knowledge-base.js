"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseStack = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constants_1 = require("../../constants");
class KnowledgeBaseStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        // add AOSS access to the role
        props.openSearch.knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['aoss:APIAccessAll'],
            resources: [
                `arn:aws:aoss:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:collection/${props.openSearch.openSearchCollection.attrId}`
            ]
        }));
        // add s3 access to the role
        props.openSearch.knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.s3bucket.bucketArn, props.s3bucket.bucketArn + "/*"]
        }));
        // add bedrock access to the role
        props.openSearch.knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:InvokeModel'],
            resources: [
                `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/amazon.titan-embed-text-v2:0`
            ]
        }));
        const knowledgeBase = new aws_cdk_lib_1.aws_bedrock.CfnKnowledgeBase(scope, 'KnowledgeBase', {
            knowledgeBaseConfiguration: {
                type: 'VECTOR',
                vectorKnowledgeBaseConfiguration: {
                    embeddingModelArn: `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/amazon.titan-embed-text-v2:0`,
                },
            },
            name: `${constants_1.stackName}-kb`,
            roleArn: props.openSearch.knowledgeBaseRole.roleArn,
            storageConfiguration: {
                type: 'OPENSEARCH_SERVERLESS',
                // the properties below are optional
                opensearchServerlessConfiguration: {
                    collectionArn: props.openSearch.openSearchCollection.attrArn,
                    fieldMapping: {
                        metadataField: 'metadata_field',
                        textField: 'text_field',
                        vectorField: 'vector_field',
                    },
                    vectorIndexName: 'knowledge-base-index',
                },
            },
            // the properties below are optional
            description: `Bedrock Knowledge Base for ${constants_1.stackName}`,
        });
        knowledgeBase.addDependency(props.openSearch.openSearchCollection);
        knowledgeBase.node.addDependency(props.openSearch.lambdaCustomResource);
        const dataSource = new aws_cdk_lib_1.aws_bedrock.CfnDataSource(scope, 'S3DataSource', {
            dataSourceConfiguration: {
                type: 'S3',
                s3Configuration: {
                    bucketArn: props.s3bucket.bucketArn,
                },
            },
            knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
            name: `${constants_1.stackName}-kb-datasource`,
            // the properties below are optional      
            description: 'S3 data source',
            vectorIngestionConfiguration: {
                chunkingConfiguration: {
                    chunkingStrategy: 'FIXED_SIZE',
                    // the properties below are optional
                    fixedSizeChunkingConfiguration: {
                        maxTokens: 300,
                        overlapPercentage: 10,
                    },
                    // hierarchicalChunkingConfiguration: {
                    //   levelConfigurations: [{
                    //     maxTokens: 123,
                    //   }],
                    //   overlapTokens: 123,
                    // },
                    // semanticChunkingConfiguration: {
                    //   breakpointPercentileThreshold: 123,
                    //   bufferSize: 123,
                    //   maxTokens: 123,
                    // },
                },
                // parsingConfiguration: {
                //   parsingStrategy: 'parsingStrategy',
                //   // the properties below are optional
                //   bedrockFoundationModelConfiguration: {
                //     modelArn: 'modelArn',
                //     // the properties below are optional
                //     parsingPrompt: {
                //       parsingPromptText: 'parsingPromptText',
                //     },
                //   },
                // },
            },
        });
        dataSource.addDependency(knowledgeBase);
        this.knowledgeBase = knowledgeBase;
        this.dataSource = dataSource;
    }
}
exports.KnowledgeBaseStack = KnowledgeBaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia25vd2xlZGdlLWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJrbm93bGVkZ2UtYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMsMkNBQTJDO0FBTzNDLDZDQUFxRDtBQUdyRCwrQ0FBMkM7QUFRM0MsTUFBYSxrQkFBbUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUsvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsOEJBQThCO1FBQzlCLEtBQUssQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUM1QyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztZQUM5QixTQUFTLEVBQUU7Z0JBQ1QsZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLGVBQWUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7YUFDckk7U0FDRixDQUNBLENBQ0YsQ0FBQTtRQUVELDRCQUE0QjtRQUM1QixLQUFLLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDckUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsTUFBTTthQUNQO1lBQ0QsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1NB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QyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFeEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDL0IsQ0FBQztDQUNGO0FBaElELGdEQWdJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgdHJpZ2dlcnMgZnJvbSAnYXdzLWNkay1saWIvdHJpZ2dlcnMnXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJ1xuXG5pbXBvcnQgeyBhd3Nfb3BlbnNlYXJjaHNlcnZlcmxlc3MgYXMgb3BlbnNlYXJjaHNlcnZlcmxlc3MgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBhd3NfYmVkcm9jayBhcyBiZWRyb2NrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgc3RhY2tOYW1lIH0gZnJvbSBcIi4uLy4uL2NvbnN0YW50c1wiXG5pbXBvcnQgeyBPcGVuU2VhcmNoU3RhY2sgfSBmcm9tIFwiLi4vb3BlbnNlYXJjaC9vcGVuc2VhcmNoXCJcblxuZXhwb3J0IGludGVyZmFjZSBLbm93bGVkZ2VCYXNlU3RhY2tQcm9wcyB7XG4gIHJlYWRvbmx5IG9wZW5TZWFyY2g6IE9wZW5TZWFyY2hTdGFjayxcbiAgcmVhZG9ubHkgczNidWNrZXQgOiBzMy5CdWNrZXRcbn1cblxuZXhwb3J0IGNsYXNzIEtub3dsZWRnZUJhc2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG5cbiAgcHVibGljIHJlYWRvbmx5IGtub3dsZWRnZUJhc2U6IGJlZHJvY2suQ2ZuS25vd2xlZGdlQmFzZTtcbiAgcHVibGljIHJlYWRvbmx5IGRhdGFTb3VyY2U6IGJlZHJvY2suQ2ZuRGF0YVNvdXJjZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogS25vd2xlZGdlQmFzZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gYWRkIEFPU1MgYWNjZXNzIHRvIHRoZSByb2xlXG4gICAgcHJvcHMub3BlblNlYXJjaC5rbm93bGVkZ2VCYXNlUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2Fvc3M6QVBJQWNjZXNzQWxsJ10sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOmFvc3M6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTpjb2xsZWN0aW9uLyR7cHJvcHMub3BlblNlYXJjaC5vcGVuU2VhcmNoQ29sbGVjdGlvbi5hdHRySWR9YFxuICAgICAgICBdXG4gICAgICB9XG4gICAgICApXG4gICAgKVxuXG4gICAgLy8gYWRkIHMzIGFjY2VzcyB0byB0aGUgcm9sZVxuICAgIHByb3BzLm9wZW5TZWFyY2gua25vd2xlZGdlQmFzZVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6KidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5zM2J1Y2tldC5idWNrZXRBcm4sIHByb3BzLnMzYnVja2V0LmJ1Y2tldEFybiArIFwiLypcIl1cbiAgICB9KSk7XG5cbiAgICAvLyBhZGQgYmVkcm9jayBhY2Nlc3MgdG8gdGhlIHJvbGVcbiAgICBwcm9wcy5vcGVuU2VhcmNoLmtub3dsZWRnZUJhc2VSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFsnYmVkcm9jazpJbnZva2VNb2RlbCddLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGBhcm46YXdzOmJlZHJvY2s6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC9hbWF6b24udGl0YW4tZW1iZWQtdGV4dC12MjowYFxuICAgICAgXVxuICAgIH1cbiAgICApXG4gICAgKVxuXG5cbiAgICBjb25zdCBrbm93bGVkZ2VCYXNlID0gbmV3IGJlZHJvY2suQ2ZuS25vd2xlZGdlQmFzZShzY29wZSwgJ0tub3dsZWRnZUJhc2UnLCB7XG4gICAgICBrbm93bGVkZ2VCYXNlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICB0eXBlOiAnVkVDVE9SJyxcbiAgICAgICAgdmVjdG9yS25vd2xlZGdlQmFzZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICBlbWJlZGRpbmdNb2RlbEFybjogYGFybjphd3M6YmVkcm9jazoke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259Ojpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi50aXRhbi1lbWJlZC10ZXh0LXYyOjBgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIG5hbWU6IGAke3N0YWNrTmFtZX0ta2JgLFxuICAgICAgcm9sZUFybjogcHJvcHMub3BlblNlYXJjaC5rbm93bGVkZ2VCYXNlUm9sZS5yb2xlQXJuLFxuICAgICAgc3RvcmFnZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgdHlwZTogJ09QRU5TRUFSQ0hfU0VSVkVSTEVTUycsXG5cbiAgICAgICAgLy8gdGhlIHByb3BlcnRpZXMgYmVsb3cgYXJlIG9wdGlvbmFsXG4gICAgICAgIG9wZW5zZWFyY2hTZXJ2ZXJsZXNzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIGNvbGxlY3Rpb25Bcm46IHByb3BzLm9wZW5TZWFyY2gub3BlblNlYXJjaENvbGxlY3Rpb24uYXR0ckFybixcbiAgICAgICAgICBmaWVsZE1hcHBpbmc6IHtcbiAgICAgICAgICAgIG1ldGFkYXRhRmllbGQ6ICdtZXRhZGF0YV9maWVsZCcsXG4gICAgICAgICAgICB0ZXh0RmllbGQ6ICd0ZXh0X2ZpZWxkJyxcbiAgICAgICAgICAgIHZlY3RvckZpZWxkOiAndmVjdG9yX2ZpZWxkJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHZlY3RvckluZGV4TmFtZTogJ2tub3dsZWRnZS1iYXNlLWluZGV4JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG5cbiAgICAgIC8vIHRoZSBwcm9wZXJ0aWVzIGJlbG93IGFyZSBvcHRpb25hbFxuICAgICAgZGVzY3JpcHRpb246IGBCZWRyb2NrIEtub3dsZWRnZSBCYXNlIGZvciAke3N0YWNrTmFtZX1gLFxuICAgIH0pO1xuXG4gICAga25vd2xlZGdlQmFzZS5hZGREZXBlbmRlbmN5KHByb3BzLm9wZW5TZWFyY2gub3BlblNlYXJjaENvbGxlY3Rpb24pO1xuICAgIGtub3dsZWRnZUJhc2Uubm9kZS5hZGREZXBlbmRlbmN5KHByb3BzLm9wZW5TZWFyY2gubGFtYmRhQ3VzdG9tUmVzb3VyY2UpXG5cbiAgICBjb25zdCBkYXRhU291cmNlID0gbmV3IGJlZHJvY2suQ2ZuRGF0YVNvdXJjZShzY29wZSwgJ1MzRGF0YVNvdXJjZScsIHtcbiAgICAgIGRhdGFTb3VyY2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHR5cGU6ICdTMycsXG4gICAgICAgIHMzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIGJ1Y2tldEFybjogcHJvcHMuczNidWNrZXQuYnVja2V0QXJuLFxuICAgICAgICB9LFxuXG4gICAgICB9LFxuICAgICAga25vd2xlZGdlQmFzZUlkOiBrbm93bGVkZ2VCYXNlLmF0dHJLbm93bGVkZ2VCYXNlSWQsXG4gICAgICBuYW1lOiBgJHtzdGFja05hbWV9LWtiLWRhdGFzb3VyY2VgLFxuXG4gICAgICAvLyB0aGUgcHJvcGVydGllcyBiZWxvdyBhcmUgb3B0aW9uYWwgICAgICBcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgZGF0YSBzb3VyY2UnLFxuICAgICAgdmVjdG9ySW5nZXN0aW9uQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBjaHVua2luZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICBjaHVua2luZ1N0cmF0ZWd5OiAnRklYRURfU0laRScsXG5cbiAgICAgICAgICAvLyB0aGUgcHJvcGVydGllcyBiZWxvdyBhcmUgb3B0aW9uYWxcbiAgICAgICAgICBmaXhlZFNpemVDaHVua2luZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIG1heFRva2VuczogMzAwLFxuICAgICAgICAgICAgb3ZlcmxhcFBlcmNlbnRhZ2U6IDEwLFxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBoaWVyYXJjaGljYWxDaHVua2luZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAvLyAgIGxldmVsQ29uZmlndXJhdGlvbnM6IFt7XG4gICAgICAgICAgLy8gICAgIG1heFRva2VuczogMTIzLFxuICAgICAgICAgIC8vICAgfV0sXG4gICAgICAgICAgLy8gICBvdmVybGFwVG9rZW5zOiAxMjMsXG4gICAgICAgICAgLy8gfSxcbiAgICAgICAgICAvLyBzZW1hbnRpY0NodW5raW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIC8vICAgYnJlYWtwb2ludFBlcmNlbnRpbGVUaHJlc2hvbGQ6IDEyMyxcbiAgICAgICAgICAvLyAgIGJ1ZmZlclNpemU6IDEyMyxcbiAgICAgICAgICAvLyAgIG1heFRva2VuczogMTIzLFxuICAgICAgICAgIC8vIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIHBhcnNpbmdDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIC8vICAgcGFyc2luZ1N0cmF0ZWd5OiAncGFyc2luZ1N0cmF0ZWd5JyxcblxuICAgICAgICAvLyAgIC8vIHRoZSBwcm9wZXJ0aWVzIGJlbG93IGFyZSBvcHRpb25hbFxuICAgICAgICAvLyAgIGJlZHJvY2tGb3VuZGF0aW9uTW9kZWxDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIC8vICAgICBtb2RlbEFybjogJ21vZGVsQXJuJyxcblxuICAgICAgICAvLyAgICAgLy8gdGhlIHByb3BlcnRpZXMgYmVsb3cgYXJlIG9wdGlvbmFsXG4gICAgICAgIC8vICAgICBwYXJzaW5nUHJvbXB0OiB7XG4gICAgICAgIC8vICAgICAgIHBhcnNpbmdQcm9tcHRUZXh0OiAncGFyc2luZ1Byb21wdFRleHQnLFxuICAgICAgICAvLyAgICAgfSxcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGRhdGFTb3VyY2UuYWRkRGVwZW5kZW5jeShrbm93bGVkZ2VCYXNlKTsgICAgXG5cbiAgICB0aGlzLmtub3dsZWRnZUJhc2UgPSBrbm93bGVkZ2VCYXNlO1xuICAgIHRoaXMuZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2U7XG4gIH1cbn0iXX0=