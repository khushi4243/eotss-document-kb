"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
class TableStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Define the table
        const chatHistoryTable = new aws_dynamodb_1.Table(scope, 'ChatHistoryTable', {
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'session_id', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // Add a global secondary index to sort ChatHistoryTable by time_stamp
        chatHistoryTable.addGlobalSecondaryIndex({
            indexName: 'TimeIndex',
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'time_stamp', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.historyTable = chatHistoryTable;
        // Define the second table (UserFeedbackTable)
        const userFeedbackTable = new aws_dynamodb_1.Table(scope, 'UserFeedbackTable', {
            partitionKey: { name: 'Topic', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // Add a global secondary index to UserFeedbackTable with partition key CreatedAt
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'CreatedAtIndex',
            partitionKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'AnyIndex',
            partitionKey: { name: 'Any', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.feedbackTable = userFeedbackTable;
        const evalSummariesTable = new aws_dynamodb_1.Table(scope, 'EvaluationSummariesTable', {
            partitionKey: { name: 'PartitionKey', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
        });
        this.evalSummaryTable = evalSummariesTable;
        const evalResultsTable = new aws_dynamodb_1.Table(scope, 'EvaluationResultsTable', {
            partitionKey: { name: 'EvaluationId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'QuestionId', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // add secondary index to sort EvaluationResultsTable by Question ID
        evalResultsTable.addGlobalSecondaryIndex({
            indexName: 'QuestionIndex',
            partitionKey: { name: 'EvaluationId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'QuestionId', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.evalResultsTable = evalResultsTable;
        const activeSystemPromptsTable = new aws_dynamodb_1.Table(scope, 'ActiveSystemPromptsTable', {
            partitionKey: { name: 'PartitionKey', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
        });
        this.activeSystemPromptsTable = activeSystemPromptsTable;
        const stagedSystemPromptsTable = new aws_dynamodb_1.Table(scope, 'StagedSystemPromptsTable', {
            partitionKey: { name: 'PartitionKey', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
        });
        this.stagedSystemPromptsTable = stagedSystemPromptsTable;
    }
}
exports.TableStack = TableStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFnRDtBQUVoRCwyREFBMkY7QUFFM0YsTUFBYSxVQUFXLFNBQVEsbUJBQUs7SUFPbkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUMxRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtQkFBbUI7UUFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG9CQUFLLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1lBQzVELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzdELE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1NBQzVELENBQUMsQ0FBQztRQUVILHNFQUFzRTtRQUN0RSxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQztZQUN2QyxTQUFTLEVBQUUsV0FBVztZQUN0QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUM3RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMzRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUM7UUFFckMsOENBQThDO1FBQzlDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxvQkFBSyxDQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBRTtZQUM5RCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFD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QUU7U0FDM0QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHdCQUF3QixHQUFHLHdCQUF3QixDQUFDO0lBRTNELENBQUM7Q0FDRjtBQS9FRCxnQ0ErRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgQXR0cmlidXRlLCBBdHRyaWJ1dGVUeXBlLCBUYWJsZSwgUHJvamVjdGlvblR5cGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuXG5leHBvcnQgY2xhc3MgVGFibGVTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGhpc3RvcnlUYWJsZSA6IFRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgZmVlZGJhY2tUYWJsZSA6IFRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgZXZhbFJlc3VsdHNUYWJsZSA6IFRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgZXZhbFN1bW1hcnlUYWJsZSA6IFRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgYWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlIDogVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBzdGFnZWRTeXN0ZW1Qcm9tcHRzVGFibGUgOiBUYWJsZTtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBEZWZpbmUgdGhlIHRhYmxlXG4gICAgY29uc3QgY2hhdEhpc3RvcnlUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ0NoYXRIaXN0b3J5VGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJfaWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnc2Vzc2lvbl9pZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgYSBnbG9iYWwgc2Vjb25kYXJ5IGluZGV4IHRvIHNvcnQgQ2hhdEhpc3RvcnlUYWJsZSBieSB0aW1lX3N0YW1wXG4gICAgY2hhdEhpc3RvcnlUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdUaW1lSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VyX2lkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVfc3RhbXAnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcblxuICAgIHRoaXMuaGlzdG9yeVRhYmxlID0gY2hhdEhpc3RvcnlUYWJsZTtcblxuICAgIC8vIERlZmluZSB0aGUgc2Vjb25kIHRhYmxlIChVc2VyRmVlZGJhY2tUYWJsZSlcbiAgICBjb25zdCB1c2VyRmVlZGJhY2tUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ1VzZXJGZWVkYmFja1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdUb3BpYycsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGEgZ2xvYmFsIHNlY29uZGFyeSBpbmRleCB0byBVc2VyRmVlZGJhY2tUYWJsZSB3aXRoIHBhcnRpdGlvbiBrZXkgQ3JlYXRlZEF0XG4gICAgdXNlckZlZWRiYWNrVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnQ3JlYXRlZEF0SW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcbiAgICBcbiAgICB1c2VyRmVlZGJhY2tUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdBbnlJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ0FueScsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcbiAgICB0aGlzLmZlZWRiYWNrVGFibGUgPSB1c2VyRmVlZGJhY2tUYWJsZTsgXG4gICAgXG4gICAgY29uc3QgZXZhbFN1bW1hcmllc1RhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCAnRXZhbHVhdGlvblN1bW1hcmllc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQYXJ0aXRpb25LZXknLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnVGltZXN0YW1wJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcbiAgICB0aGlzLmV2YWxTdW1tYXJ5VGFibGUgPSBldmFsU3VtbWFyaWVzVGFibGU7XG5cbiAgICBjb25zdCBldmFsUmVzdWx0c1RhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCAnRXZhbHVhdGlvblJlc3VsdHNUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRXZhbHVhdGlvbklkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1F1ZXN0aW9uSWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuICAgIC8vIGFkZCBzZWNvbmRhcnkgaW5kZXggdG8gc29ydCBFdmFsdWF0aW9uUmVzdWx0c1RhYmxlIGJ5IFF1ZXN0aW9uIElEXG4gICAgZXZhbFJlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdRdWVzdGlvbkluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRXZhbHVhdGlvbklkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1F1ZXN0aW9uSWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcbiAgICB0aGlzLmV2YWxSZXN1bHRzVGFibGUgPSBldmFsUmVzdWx0c1RhYmxlO1xuXG4gICAgY29uc3QgYWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCAnQWN0aXZlU3lzdGVtUHJvbXB0c1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQYXJ0aXRpb25LZXknLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnVGltZXN0YW1wJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSwgXG4gICAgfSk7XG4gICAgdGhpcy5hY3RpdmVTeXN0ZW1Qcm9tcHRzVGFibGUgPSBhY3RpdmVTeXN0ZW1Qcm9tcHRzVGFibGU7XG5cbiAgICBjb25zdCBzdGFnZWRTeXN0ZW1Qcm9tcHRzVGFibGUgPSBuZXcgVGFibGUoc2NvcGUsICdTdGFnZWRTeXN0ZW1Qcm9tcHRzVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BhcnRpdGlvbktleScsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdUaW1lc3RhbXAnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LCBcbiAgICB9KTtcbiAgICB0aGlzLnN0YWdlZFN5c3RlbVByb21wdHNUYWJsZSA9IHN0YWdlZFN5c3RlbVByb21wdHNUYWJsZTtcblxuICB9XG59XG4iXX0=