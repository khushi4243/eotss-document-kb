"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationStack = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const constants_1 = require("../constants");
const aws_cognito_1 = require("aws-cdk-lib/aws-cognito");
const cognito = require("aws-cdk-lib/aws-cognito");
const lambda = require("aws-cdk-lib/aws-lambda");
const path = require("path");
class AuthorizationStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Replace these values with your Azure client ID, client secret, and issuer URL
        // const azureClientId = 'your-azure-client-id';
        // const azureClientSecret = 'your-azure-client-secret';
        // const azureIssuerUrl = 'https://your-azure-issuer.com';
        // Create the Cognito User Pool
        const userPool = new aws_cognito_1.UserPool(this, 'UserPool', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            selfSignUpEnabled: false,
            mfa: cognito.Mfa.OPTIONAL,
            advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
            autoVerify: { email: true, phone: true },
            signInAliases: {
                email: true,
            },
            customAttributes: {
                'role': new cognito.StringAttribute({ minLen: 0, maxLen: 30, mutable: true })
            }
            // ... other user pool configurations
        });
        this.userPool = userPool;
        // Create a provider attribute for mapping Azure claims
        // const providerAttribute = new ProviderAttribute({
        //   name: 'custom_attr',
        //   type: 'String',
        // });
        userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: constants_1.cognitoDomainName,
            },
        });
        // Add the Azure OIDC identity provider to the User Pool
        // const azureProvider = new UserPoolIdentityProviderOidc(this, 'AzureProvider', {
        //   clientId: azureClientId,
        //   clientSecret: azureClientSecret,
        //   issuerUrl: azureIssuerUrl,
        //   userPool: userPool,
        //   attributeMapping: {
        //     // email: ProviderAttribute.fromString('email'),
        //     // fullname: ProviderAttribute.fromString('name'),
        //     // custom: {
        //     //   customKey: providerAttribute,
        //     // },
        //   },
        //   // ... other optional properties
        // });
        const userPoolClient = new aws_cognito_1.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            // supportedIdentityProviders: [UserPoolClientIdentityProvider.custom(azureProvider.providerName)],
        });
        this.userPoolClient = userPoolClient;
        const authorizerHandlerFunction = new lambda.Function(this, 'AuthorizationFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-api-authorizer')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "USER_POOL_ID": userPool.userPoolId,
                "APP_CLIENT_ID": userPoolClient.userPoolClientId
            },
            timeout: cdk.Duration.seconds(30)
        });
        this.lambdaAuthorizer = authorizerHandlerFunction;
        new cdk.CfnOutput(this, "UserPool ID", {
            value: userPool.userPoolId || "",
        });
        new cdk.CfnOutput(this, "UserPool Client ID", {
            value: userPoolClient.userPoolClientId || "",
        });
        // new cdk.CfnOutput(this, "UserPool Client Name", {
        //   value: userPoolClient.userPoolClientName || "",
        // });
    }
}
exports.AuthorizationStack = AuthorizationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBQ3ZDLDRDQUFnRDtBQUNoRCx5REFBbUo7QUFDbkosbURBQW1EO0FBQ25ELGlEQUFpRDtBQUNqRCw2QkFBNkI7QUFFN0IsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUsvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsZ0ZBQWdGO1FBQ2hGLGdEQUFnRDtRQUNoRCx3REFBd0Q7UUFDeEQsMERBQTBEO1FBRTFELCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM5QyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUTtZQUN6QixvQkFBb0IsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDeEMsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxnQkFBZ0IsRUFBRztnQkFDakIsTUFBTSxFQUFHLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDL0U7WUFDRCxxQ0FBcUM7U0FDdEMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsdURBQXVEO1FBQ3ZELG9EQUFvRDtRQUNwRCx5QkFBeUI7UUFDekIsb0JBQW9CO1FBQ3BCLE1BQU07UUFDTixRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUNsQyxhQUFhLEVBQUU7Z0JBQ2IsWUFBWSxFQUFFLDZCQUFpQjthQUNoQztTQUNGLENBQUMsQ0FBQztRQUdILHdEQUF3RDtRQUN4RCxrRkFBa0Y7UUFDbEYsNkJBQTZCO1FBQzdCLHFDQUFxQztRQUNyQywrQkFBK0I7UUFDL0Isd0JBQXdCO1FBQ3hCLHdCQUF3QjtRQUN4Qix1REFBdUQ7UUFDdkQseURBQXlEO1FBQ3pELG1CQUFtQjtRQUNuQix5Q0FBeUM7UUFDekMsWUFBWTtRQUNaLE9BQU87UUFDUCxxQ0FBcUM7UUFDckMsTUFBTTtRQUVOLE1BQU0sY0FBYyxHQUFHLElBQUksNEJBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDaEUsUUFBUTtZQUNSLG1HQUFtRztTQUNwRyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUVyQyxNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDbkYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLHVDQUF1QztZQUM1RSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsQ0FBQyxFQUFFLGlDQUFpQztZQUNoSCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUscURBQXFEO1lBQ2hHLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUcsUUFBUSxDQUFDLFVBQVU7Z0JBQ3BDLGVBQWUsRUFBRyxjQUFjLENBQUMsZ0JBQWdCO2FBQ2xEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcseUJBQXlCLENBQUM7UUFFbEQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLElBQUksRUFBRTtTQUNqQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCLElBQUksRUFBRTtTQUM3QyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsb0RBQW9EO1FBQ3BELE1BQU07SUFJUixDQUFDO0NBQ0Y7QUE3RkQsZ0RBNkZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgY29nbml0b0RvbWFpbk5hbWUgfSBmcm9tICcuLi9jb25zdGFudHMnIFxuaW1wb3J0IHsgVXNlclBvb2wsIFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGMsVXNlclBvb2xDbGllbnQsIFVzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlciwgUHJvdmlkZXJBdHRyaWJ1dGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29nbml0b1wiO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEF1dGhvcml6YXRpb25TdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFBdXRob3JpemVyIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2wgOiBVc2VyUG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50IDogVXNlclBvb2xDbGllbnQ7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyBSZXBsYWNlIHRoZXNlIHZhbHVlcyB3aXRoIHlvdXIgQXp1cmUgY2xpZW50IElELCBjbGllbnQgc2VjcmV0LCBhbmQgaXNzdWVyIFVSTFxuICAgIC8vIGNvbnN0IGF6dXJlQ2xpZW50SWQgPSAneW91ci1henVyZS1jbGllbnQtaWQnO1xuICAgIC8vIGNvbnN0IGF6dXJlQ2xpZW50U2VjcmV0ID0gJ3lvdXItYXp1cmUtY2xpZW50LXNlY3JldCc7XG4gICAgLy8gY29uc3QgYXp1cmVJc3N1ZXJVcmwgPSAnaHR0cHM6Ly95b3VyLWF6dXJlLWlzc3Vlci5jb20nO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBDb2duaXRvIFVzZXIgUG9vbFxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IFVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHsgICAgICBcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogZmFsc2UsXG4gICAgICBtZmE6IGNvZ25pdG8uTWZhLk9QVElPTkFMLFxuICAgICAgYWR2YW5jZWRTZWN1cml0eU1vZGU6IGNvZ25pdG8uQWR2YW5jZWRTZWN1cml0eU1vZGUuRU5GT1JDRUQsXG4gICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlLCBwaG9uZTogdHJ1ZSB9LFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzIDoge1xuICAgICAgICAncm9sZScgOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtaW5MZW46IDAsIG1heExlbjogMzAsIG11dGFibGU6IHRydWUgfSlcbiAgICAgIH1cbiAgICAgIC8vIC4uLiBvdGhlciB1c2VyIHBvb2wgY29uZmlndXJhdGlvbnNcbiAgICB9KTtcbiAgICB0aGlzLnVzZXJQb29sID0gdXNlclBvb2w7XG5cbiAgICAvLyBDcmVhdGUgYSBwcm92aWRlciBhdHRyaWJ1dGUgZm9yIG1hcHBpbmcgQXp1cmUgY2xhaW1zXG4gICAgLy8gY29uc3QgcHJvdmlkZXJBdHRyaWJ1dGUgPSBuZXcgUHJvdmlkZXJBdHRyaWJ1dGUoe1xuICAgIC8vICAgbmFtZTogJ2N1c3RvbV9hdHRyJyxcbiAgICAvLyAgIHR5cGU6ICdTdHJpbmcnLFxuICAgIC8vIH0pO1xuICAgIHVzZXJQb29sLmFkZERvbWFpbignQ29nbml0b0RvbWFpbicsIHtcbiAgICAgIGNvZ25pdG9Eb21haW46IHtcbiAgICAgICAgZG9tYWluUHJlZml4OiBjb2duaXRvRG9tYWluTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgXG4gICAgXG4gICAgLy8gQWRkIHRoZSBBenVyZSBPSURDIGlkZW50aXR5IHByb3ZpZGVyIHRvIHRoZSBVc2VyIFBvb2xcbiAgICAvLyBjb25zdCBhenVyZVByb3ZpZGVyID0gbmV3IFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGModGhpcywgJ0F6dXJlUHJvdmlkZXInLCB7XG4gICAgLy8gICBjbGllbnRJZDogYXp1cmVDbGllbnRJZCxcbiAgICAvLyAgIGNsaWVudFNlY3JldDogYXp1cmVDbGllbnRTZWNyZXQsXG4gICAgLy8gICBpc3N1ZXJVcmw6IGF6dXJlSXNzdWVyVXJsLFxuICAgIC8vICAgdXNlclBvb2w6IHVzZXJQb29sLFxuICAgIC8vICAgYXR0cmlidXRlTWFwcGluZzoge1xuICAgIC8vICAgICAvLyBlbWFpbDogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnZW1haWwnKSxcbiAgICAvLyAgICAgLy8gZnVsbG5hbWU6IFByb3ZpZGVyQXR0cmlidXRlLmZyb21TdHJpbmcoJ25hbWUnKSxcbiAgICAvLyAgICAgLy8gY3VzdG9tOiB7XG4gICAgLy8gICAgIC8vICAgY3VzdG9tS2V5OiBwcm92aWRlckF0dHJpYnV0ZSxcbiAgICAvLyAgICAgLy8gfSxcbiAgICAvLyAgIH0sXG4gICAgLy8gICAvLyAuLi4gb3RoZXIgb3B0aW9uYWwgcHJvcGVydGllc1xuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sQ2xpZW50Jywge1xuICAgICAgdXNlclBvb2wsICAgICAgXG4gICAgICAvLyBzdXBwb3J0ZWRJZGVudGl0eVByb3ZpZGVyczogW1VzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlci5jdXN0b20oYXp1cmVQcm92aWRlci5wcm92aWRlck5hbWUpXSxcbiAgICB9KTtcblxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSB1c2VyUG9vbENsaWVudDtcblxuICAgIGNvbnN0IGF1dGhvcml6ZXJIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRob3JpemF0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3dlYnNvY2tldC1hcGktYXV0aG9yaXplcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiVVNFUl9QT09MX0lEXCIgOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBcIkFQUF9DTElFTlRfSURcIiA6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIHRoaXMubGFtYmRhQXV0aG9yaXplciA9IGF1dGhvcml6ZXJIYW5kbGVyRnVuY3Rpb247XG4gICAgXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBJRFwiLCB7XG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCB8fCBcIlwiLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBDbGllbnQgSURcIiwge1xuICAgICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQgfHwgXCJcIixcbiAgICB9KTtcblxuICAgIC8vIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2wgQ2xpZW50IE5hbWVcIiwge1xuICAgIC8vICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50TmFtZSB8fCBcIlwiLFxuICAgIC8vIH0pO1xuXG5cbiAgICBcbiAgfVxufVxuIl19