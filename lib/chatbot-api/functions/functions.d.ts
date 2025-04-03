import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import { StepFunctionsStack } from './step-functions/step-functions';
interface LambdaFunctionStackProps {
    readonly wsApiEndpoint: string;
    readonly sessionTable: Table;
    readonly feedbackTable: Table;
    readonly feedbackBucket: s3.Bucket;
    readonly knowledgeBucket: s3.Bucket;
    readonly knowledgeBase: bedrock.CfnKnowledgeBase;
    readonly knowledgeBaseSource: bedrock.CfnDataSource;
    readonly evalTestCasesBucket: s3.Bucket;
    readonly stagedSystemPromptsTable: Table;
    readonly activeSystemPromptsTable: Table;
    readonly evalSummariesTable: Table;
    readonly evalResutlsTable: Table;
}
export declare class LambdaFunctionStack extends cdk.Stack {
    readonly chatFunction: lambda.Function;
    readonly sessionFunction: lambda.Function;
    readonly feedbackFunction: lambda.Function;
    readonly deleteS3Function: lambda.Function;
    readonly getS3KnowledgeFunction: lambda.Function;
    readonly getS3TestCasesFunction: lambda.Function;
    readonly uploadS3KnowledgeFunction: lambda.Function;
    readonly uploadS3TestCasesFunction: lambda.Function;
    readonly syncKBFunction: lambda.Function;
    readonly metadataHandlerFunction: lambda.Function;
    readonly handleEvalResultsFunction: lambda.Function;
    readonly stepFunctionsStack: StepFunctionsStack;
    readonly systemPromptsFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: LambdaFunctionStackProps);
}
export {};
