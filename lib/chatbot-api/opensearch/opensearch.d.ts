import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import { aws_opensearchserverless as opensearchserverless } from 'aws-cdk-lib';
export interface OpenSearchStackProps {
}
export declare class OpenSearchStack extends cdk.Stack {
    readonly openSearchCollection: opensearchserverless.CfnCollection;
    readonly collectionName: string;
    readonly knowledgeBaseRole: iam.Role;
    readonly lambdaCustomResource: cdk.CustomResource;
    constructor(scope: Construct, id: string, props: OpenSearchStackProps);
}
