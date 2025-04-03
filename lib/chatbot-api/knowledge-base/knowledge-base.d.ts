import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { Construct } from "constructs";
import { OpenSearchStack } from "../opensearch/opensearch";
export interface KnowledgeBaseStackProps {
    readonly openSearch: OpenSearchStack;
    readonly s3bucket: s3.Bucket;
}
export declare class KnowledgeBaseStack extends cdk.Stack {
    readonly knowledgeBase: bedrock.CfnKnowledgeBase;
    readonly dataSource: bedrock.CfnDataSource;
    constructor(scope: Construct, id: string, props: KnowledgeBaseStackProps);
}
