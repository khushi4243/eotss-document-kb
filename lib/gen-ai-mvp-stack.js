"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenAiMvpStack = void 0;
const cdk = require("aws-cdk-lib");
const chatbot_api_1 = require("./chatbot-api");
const constants_1 = require("./constants");
const authorization_1 = require("./authorization");
const user_interface_1 = require("./user-interface");
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class GenAiMvpStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // The code that defines your stack goes here
        // example resource
        // const queue = new sqs.Queue(this, 'GenAiMvpQueue', {
        //   visibilityTimeout: cdk.Duration.seconds(300)
        // });
        // let authentication;
        // if (AUTHENTICATION) {
        //   authentication = new AuthorizationStack(this, "Authorization")
        // }
        const authentication = new authorization_1.AuthorizationStack(this, "Authorization");
        const chatbotAPI = new chatbot_api_1.ChatBotApi(this, "ChatbotAPI", { authentication });
        const userInterface = new user_interface_1.UserInterface(this, "UserInterface", { userPoolId: authentication.userPool.userPoolId,
            userPoolClientId: authentication.userPoolClient.userPoolClientId,
            cognitoDomain: constants_1.cognitoDomainName,
            api: chatbotAPI
        });
    }
}
exports.GenAiMvpStack = GenAiMvpStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLWFpLW12cC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlbi1haS1tdnAtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLCtDQUEyQztBQUMzQywyQ0FBK0M7QUFDL0MsbURBQW9EO0FBQ3BELHFEQUFnRDtBQUVoRCw4Q0FBOEM7QUFFOUMsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw2Q0FBNkM7UUFFN0MsbUJBQW1CO1FBQ25CLHVEQUF1RDtRQUN2RCxpREFBaUQ7UUFDakQsTUFBTTtRQUNOLHNCQUFzQjtRQUN0Qix3QkFBd0I7UUFDeEIsbUVBQW1FO1FBQ25FLElBQUk7UUFDSixNQUFNLGNBQWMsR0FBRyxJQUFJLGtDQUFrQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNwRSxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFDLGNBQWMsRUFBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQzVELEVBQUMsVUFBVSxFQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVTtZQUMvQyxnQkFBZ0IsRUFBRyxjQUFjLENBQUMsY0FBYyxDQUFDLGdCQUFnQjtZQUNqRSxhQUFhLEVBQUcsNkJBQWlCO1lBQ2pDLEdBQUcsRUFBRyxVQUFVO1NBQ2pCLENBQUMsQ0FBQTtJQUVKLENBQUM7Q0FDRjtBQXhCRCxzQ0F3QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4vY2hhdGJvdC1hcGlcIjtcbmltcG9ydCB7IGNvZ25pdG9Eb21haW5OYW1lIH0gZnJvbSBcIi4vY29uc3RhbnRzXCJcbmltcG9ydCB7IEF1dGhvcml6YXRpb25TdGFjayB9IGZyb20gXCIuL2F1dGhvcml6YXRpb25cIlxuaW1wb3J0IHsgVXNlckludGVyZmFjZSB9IGZyb20gXCIuL3VzZXItaW50ZXJmYWNlXCJcblxuLy8gaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuXG5leHBvcnQgY2xhc3MgR2VuQWlNdnBTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFRoZSBjb2RlIHRoYXQgZGVmaW5lcyB5b3VyIHN0YWNrIGdvZXMgaGVyZVxuXG4gICAgLy8gZXhhbXBsZSByZXNvdXJjZVxuICAgIC8vIGNvbnN0IHF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnR2VuQWlNdnBRdWV1ZScsIHtcbiAgICAvLyAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApXG4gICAgLy8gfSk7XG4gICAgLy8gbGV0IGF1dGhlbnRpY2F0aW9uO1xuICAgIC8vIGlmIChBVVRIRU5USUNBVElPTikge1xuICAgIC8vICAgYXV0aGVudGljYXRpb24gPSBuZXcgQXV0aG9yaXphdGlvblN0YWNrKHRoaXMsIFwiQXV0aG9yaXphdGlvblwiKVxuICAgIC8vIH1cbiAgICBjb25zdCBhdXRoZW50aWNhdGlvbiA9IG5ldyBBdXRob3JpemF0aW9uU3RhY2sodGhpcywgXCJBdXRob3JpemF0aW9uXCIpXG4gICAgY29uc3QgY2hhdGJvdEFQSSA9IG5ldyBDaGF0Qm90QXBpKHRoaXMsIFwiQ2hhdGJvdEFQSVwiLCB7YXV0aGVudGljYXRpb259KTtcbiAgICBjb25zdCB1c2VySW50ZXJmYWNlID0gbmV3IFVzZXJJbnRlcmZhY2UodGhpcywgXCJVc2VySW50ZXJmYWNlXCIsXG4gICAgIHt1c2VyUG9vbElkIDogYXV0aGVudGljYXRpb24udXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIHVzZXJQb29sQ2xpZW50SWQgOiBhdXRoZW50aWNhdGlvbi51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgY29nbml0b0RvbWFpbiA6IGNvZ25pdG9Eb21haW5OYW1lLFxuICAgICAgYXBpIDogY2hhdGJvdEFQSVxuICAgIH0pXG4gICAgXG4gIH1cbn1cbiJdfQ==