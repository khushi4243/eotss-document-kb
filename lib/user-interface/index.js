"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInterface = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const constructs_1 = require("constructs");
const node_child_process_1 = require("node:child_process");
const path = require("node:path");
const generate_app_1 = require("./generate-app");
const cdk_nag_1 = require("cdk-nag");
const utils_1 = require("../shared/utils");
const constants_1 = require("../constants");
class UserInterface extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const appPath = path.join(__dirname, "app");
        const buildPath = path.join(appPath, "dist");
        const uploadLogsBucket = new s3.Bucket(this, "WebsiteLogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            // bucketName: props.config.privateWebsite ? props.config.domain : undefined,
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "index.html",
            enforceSSL: true,
            serverAccessLogsBucket: uploadLogsBucket,
        });
        // Deploy either Private (only accessible within VPC) or Public facing website
        let apiEndpoint;
        let websocketEndpoint;
        let distribution;
        const publicWebsite = new generate_app_1.Website(this, "Website", { ...props, websiteBucket: websiteBucket });
        distribution = publicWebsite.distribution;
        const exportsAsset = s3deploy.Source.jsonData("aws-exports.json", {
            Auth: {
                region: cdk.Aws.REGION,
                userPoolId: props.userPoolId,
                userPoolWebClientId: props.userPoolClientId,
                oauth: {
                    domain: props.cognitoDomain.concat(".auth.us-east-1.amazoncognito.com"),
                    scope: ["aws.cognito.signin.user.admin", "email", "openid", "profile"],
                    redirectSignIn: "https://" + distribution.distributionDomainName,
                    // redirectSignOut: "https://myapplications.microsoft.com/",
                    responseType: "code"
                }
            },
            httpEndpoint: props.api.httpAPI.restAPI.url,
            wsEndpoint: props.api.wsAPI.wsAPIStage.url,
            federatedSignInProvider: constants_1.OIDCIntegrationName
        });
        const asset = s3deploy.Source.asset(appPath, {
            bundling: {
                image: cdk.DockerImage.fromRegistry("public.ecr.aws/sam/build-nodejs18.x:latest"),
                command: [
                    "sh",
                    "-c",
                    [
                        "npm --cache /tmp/.npm install",
                        `npm --cache /tmp/.npm run build`,
                        "cp -aur /asset-input/dist/* /asset-output/",
                    ].join(" && "),
                ],
                local: {
                    tryBundle(outputDir) {
                        try {
                            const options = {
                                stdio: "inherit",
                                env: {
                                    ...process.env,
                                },
                            };
                            (0, node_child_process_1.execSync)(`npm --silent --prefix "${appPath}" ci`, options);
                            (0, node_child_process_1.execSync)(`npm --silent --prefix "${appPath}" run build`, options);
                            utils_1.Utils.copyDirRecursive(buildPath, outputDir);
                        }
                        catch (e) {
                            console.error(e);
                            return false;
                        }
                        return true;
                    },
                },
            },
        });
        new s3deploy.BucketDeployment(this, "UserInterfaceDeployment", {
            prune: false,
            sources: [asset, exportsAsset],
            destinationBucket: websiteBucket,
            distribution: distribution
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(uploadLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
    }
}
exports.UserInterface = UserInterface;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFHbkMseUNBQXlDO0FBQ3pDLDBEQUEwRDtBQUMxRCwyQ0FBdUM7QUFDdkMsMkRBRzRCO0FBQzVCLGtDQUFrQztBQUVsQyxpREFBd0M7QUFDeEMscUNBQTBDO0FBQzFDLDJDQUF1QztBQUN2Qyw0Q0FBbUQ7QUFTbkQsTUFBYSxhQUFjLFNBQVEsc0JBQVM7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTdDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNoRSxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDekQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLDZFQUE2RTtZQUM3RSxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLG9CQUFv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RUc7UUFDSCx5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyxnQkFBZ0IsRUFDaEI7WUFDRTtnQkFDRSxFQUFFLEVBQUUsaUJBQWlCO2dCQUNyQixNQUFNLEVBQUUsNERBQTREO2FBQ3JFO1NBQ0YsQ0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBaEhELHNDQWdIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGNmIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udFwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnRcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQge1xuICBFeGVjU3luY09wdGlvbnNXaXRoQnVmZmVyRW5jb2RpbmcsXG4gIGV4ZWNTeW5jLFxufSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IENoYXRCb3RBcGkgfSBmcm9tIFwiLi4vY2hhdGJvdC1hcGlcIjtcbmltcG9ydCB7IFdlYnNpdGUgfSBmcm9tIFwiLi9nZW5lcmF0ZS1hcHBcIlxuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcbmltcG9ydCB7IFV0aWxzIH0gZnJvbSBcIi4uL3NoYXJlZC91dGlsc1wiXG5pbXBvcnQgeyBPSURDSW50ZWdyYXRpb25OYW1lIH0gZnJvbSBcIi4uL2NvbnN0YW50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXJJbnRlcmZhY2VQcm9wcyB7XG4gIHJlYWRvbmx5IHVzZXJQb29sSWQ6IHN0cmluZztcbiAgcmVhZG9ubHkgdXNlclBvb2xDbGllbnRJZDogc3RyaW5nO1xuICByZWFkb25seSBhcGk6IENoYXRCb3RBcGk7XG4gIHJlYWRvbmx5IGNvZ25pdG9Eb21haW4gOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBVc2VySW50ZXJmYWNlIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFVzZXJJbnRlcmZhY2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBhcHBQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgXCJhcHBcIik7XG4gICAgY29uc3QgYnVpbGRQYXRoID0gcGF0aC5qb2luKGFwcFBhdGgsIFwiZGlzdFwiKTtcblxuICAgIGNvbnN0IHVwbG9hZExvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiV2Vic2l0ZUxvZ3NCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCB3ZWJzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIldlYnNpdGVCdWNrZXRcIiwge1xuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIC8vIGJ1Y2tldE5hbWU6IHByb3BzLmNvbmZpZy5wcml2YXRlV2Vic2l0ZSA/IHByb3BzLmNvbmZpZy5kb21haW4gOiB1bmRlZmluZWQsXG4gICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogXCJpbmRleC5odG1sXCIsXG4gICAgICB3ZWJzaXRlRXJyb3JEb2N1bWVudDogXCJpbmRleC5odG1sXCIsXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogdXBsb2FkTG9nc0J1Y2tldCxcbiAgICB9KTtcblxuICAgIC8vIERlcGxveSBlaXRoZXIgUHJpdmF0ZSAob25seSBhY2Nlc3NpYmxlIHdpdGhpbiBWUEMpIG9yIFB1YmxpYyBmYWNpbmcgd2Vic2l0ZVxuICAgIGxldCBhcGlFbmRwb2ludDogc3RyaW5nO1xuICAgIGxldCB3ZWJzb2NrZXRFbmRwb2ludDogc3RyaW5nO1xuICAgIGxldCBkaXN0cmlidXRpb247XG5cbiAgICBjb25zdCBwdWJsaWNXZWJzaXRlID0gbmV3IFdlYnNpdGUodGhpcywgXCJXZWJzaXRlXCIsIHsgLi4ucHJvcHMsIHdlYnNpdGVCdWNrZXQ6IHdlYnNpdGVCdWNrZXQgfSk7XG4gICAgZGlzdHJpYnV0aW9uID0gcHVibGljV2Vic2l0ZS5kaXN0cmlidXRpb25cblxuXG5cbiAgICBjb25zdCBleHBvcnRzQXNzZXQgPSBzM2RlcGxveS5Tb3VyY2UuanNvbkRhdGEoXCJhd3MtZXhwb3J0cy5qc29uXCIsIHtcbiAgICAgIEF1dGg6IHtcbiAgICAgICAgcmVnaW9uOiBjZGsuQXdzLlJFR0lPTixcbiAgICAgICAgdXNlclBvb2xJZDogcHJvcHMudXNlclBvb2xJZCxcbiAgICAgICAgdXNlclBvb2xXZWJDbGllbnRJZDogcHJvcHMudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgb2F1dGg6IHtcbiAgICAgICAgICBkb21haW46IHByb3BzLmNvZ25pdG9Eb21haW4uY29uY2F0KFwiLmF1dGgudXMtZWFzdC0xLmFtYXpvbmNvZ25pdG8uY29tXCIpLFxuICAgICAgICAgIHNjb3BlOiBbXCJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pblwiLFwiZW1haWxcIiwgXCJvcGVuaWRcIiwgXCJwcm9maWxlXCJdLFxuICAgICAgICAgIHJlZGlyZWN0U2lnbkluOiBcImh0dHBzOi8vXCIgKyBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcbiAgICAgICAgICAvLyByZWRpcmVjdFNpZ25PdXQ6IFwiaHR0cHM6Ly9teWFwcGxpY2F0aW9ucy5taWNyb3NvZnQuY29tL1wiLFxuICAgICAgICAgIHJlc3BvbnNlVHlwZTogXCJjb2RlXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGh0dHBFbmRwb2ludCA6IHByb3BzLmFwaS5odHRwQVBJLnJlc3RBUEkudXJsLFxuICAgICAgd3NFbmRwb2ludCA6IHByb3BzLmFwaS53c0FQSS53c0FQSVN0YWdlLnVybCxcbiAgICAgIGZlZGVyYXRlZFNpZ25JblByb3ZpZGVyIDogT0lEQ0ludGVncmF0aW9uTmFtZVxuICAgIH0pO1xuXG4gICAgY29uc3QgYXNzZXQgPSBzM2RlcGxveS5Tb3VyY2UuYXNzZXQoYXBwUGF0aCwge1xuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgaW1hZ2U6IGNkay5Eb2NrZXJJbWFnZS5mcm9tUmVnaXN0cnkoXG4gICAgICAgICAgXCJwdWJsaWMuZWNyLmF3cy9zYW0vYnVpbGQtbm9kZWpzMTgueDpsYXRlc3RcIlxuICAgICAgICApLFxuICAgICAgICBjb21tYW5kOiBbXG4gICAgICAgICAgXCJzaFwiLFxuICAgICAgICAgIFwiLWNcIixcbiAgICAgICAgICBbXG4gICAgICAgICAgICBcIm5wbSAtLWNhY2hlIC90bXAvLm5wbSBpbnN0YWxsXCIsXG4gICAgICAgICAgICBgbnBtIC0tY2FjaGUgL3RtcC8ubnBtIHJ1biBidWlsZGAsXG4gICAgICAgICAgICBcImNwIC1hdXIgL2Fzc2V0LWlucHV0L2Rpc3QvKiAvYXNzZXQtb3V0cHV0L1wiLFxuICAgICAgICAgIF0uam9pbihcIiAmJiBcIiksXG4gICAgICAgIF0sXG4gICAgICAgIGxvY2FsOiB7XG4gICAgICAgICAgdHJ5QnVuZGxlKG91dHB1dERpcjogc3RyaW5nKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBvcHRpb25zOiBFeGVjU3luY09wdGlvbnNXaXRoQnVmZmVyRW5jb2RpbmcgPSB7XG4gICAgICAgICAgICAgICAgc3RkaW86IFwiaW5oZXJpdFwiLFxuICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBleGVjU3luYyhgbnBtIC0tc2lsZW50IC0tcHJlZml4IFwiJHthcHBQYXRofVwiIGNpYCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIGV4ZWNTeW5jKGBucG0gLS1zaWxlbnQgLS1wcmVmaXggXCIke2FwcFBhdGh9XCIgcnVuIGJ1aWxkYCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIFV0aWxzLmNvcHlEaXJSZWN1cnNpdmUoYnVpbGRQYXRoLCBvdXRwdXREaXIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJVc2VySW50ZXJmYWNlRGVwbG95bWVudFwiLCB7XG4gICAgICBwcnVuZTogZmFsc2UsXG4gICAgICBzb3VyY2VzOiBbYXNzZXQsIGV4cG9ydHNBc3NldF0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogd2Vic2l0ZUJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogZGlzdHJpYnV0aW9uXG4gICAgfSk7XG5cblxuICAgIC8qKlxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cbiAgICAgKi9cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICB1cGxvYWRMb2dzQnVja2V0LFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIkJ1Y2tldCBpcyB0aGUgc2VydmVyIGFjY2VzcyBsb2dzIGJ1Y2tldCBmb3Igd2Vic2l0ZUJ1Y2tldC5cIixcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuICB9XG59XG4iXX0=