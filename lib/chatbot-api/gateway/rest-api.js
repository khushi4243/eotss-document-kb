"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestBackendAPI = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class RestBackendAPI extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const httpApi = new aws_cdk_lib_1.aws_apigatewayv2.HttpApi(this, 'HTTP-API', {
            corsPreflight: {
                allowHeaders: ['*'],
                allowMethods: [
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.GET,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.HEAD,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.OPTIONS,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.POST,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.DELETE,
                ],
                allowOrigins: ['*'],
                maxAge: aws_cdk_lib_1.Duration.days(10),
            },
        });
        this.restAPI = httpApi;
    }
}
exports.RestBackendAPI = RestBackendAPI;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdC1hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXN0LWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSwyQ0FBdUM7QUFDdkMsNkNBQW9FO0FBbUJwRSxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUUzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxPQUFPLEdBQUcsSUFBSSw4QkFBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3BELGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLFlBQVksRUFBRTtvQkFDWiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUMxQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUMzQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPO29CQUM5Qiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUMzQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNO2lCQUM5QjtnQkFDRCxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLE1BQU0sRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDMUI7U0FDRixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUFyQkQsd0NBcUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgRHVyYXRpb24sIGF3c19hcGlnYXRld2F5djIgYXMgYXBpZ3d2MiB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29nbml0b1wiO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxvZ3NcIjtcbmltcG9ydCAqIGFzIHNzbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNzbVwiO1xuLy8gaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uL3NoYXJlZFwiO1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwcHN5bmNcIjtcbi8vIGltcG9ydCB7IHBhcnNlIH0gZnJvbSBcImdyYXBocWxcIjtcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlc3RCYWNrZW5kQVBJUHJvcHMge1xuXG59XG5cbmV4cG9ydCBjbGFzcyBSZXN0QmFja2VuZEFQSSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSByZXN0QVBJOiBhcGlnd3YyLkh0dHBBcGk7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBSZXN0QmFja2VuZEFQSVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGh0dHBBcGkgPSBuZXcgYXBpZ3d2Mi5IdHRwQXBpKHRoaXMsICdIVFRQLUFQSScsIHtcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXG4gICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5HRVQsXG4gICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5IRUFELFxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXG4gICAgICAgIG1heEFnZTogRHVyYXRpb24uZGF5cygxMCksXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRoaXMucmVzdEFQSSA9IGh0dHBBcGk7ICAgIFxuICB9XG59XG4iXX0=