> **Quelle:** AWS Machine Learning Blog — „Automate cloud security vulnerability
> assessment and alerting using Amazon Bedrock" (gespeicherte Kopie als
> Interview-/Planungsreferenz, 11.9.2026). Muster: GuardDuty-Findings →
> EventBridge → Step Functions → Lambda → Bedrock (Findings-Summary +
> Remediation-Steps). Für JiMesh relevant als Vorlage für SPRINT-33 WP6
> (Bedrock-Triage) — Achtung Mandat 7: AWS-SDK nur nach Spike-Begründung.
> Original: https://aws.amazon.com/blogs/machine-learning/automate-cloud-security-vulnerability-assessment-and-alerting-using-amazon-bedrock/

Cloud technologies are progressing at a rapid pace. Businesses are adopting new innovations and technologies to create cutting-edge solutions for their customers. However, security is a big risk when adopting the latest technologies. Enterprises often rely on reactive security monitoring and notification techniques, but those techniques might not be sufficient to safeguard your enterprises from vulnerable assets and third-party attacks. You need to establish proper security guardrails in the cloud environment and create a proactive monitoring practice to strengthen your cloud security posture and maintain required compliance standards.

To address this challenge, this post demonstrates a proactive approach for security vulnerability assessment of your accounts and workloads, using [Amazon GuardDuty](https://aws.amazon.com/guardduty/), [Amazon Bedrock](https://aws.amazon.com/bedrock/), and other [AWS serverless](https://aws.amazon.com/serverless/) technologies. This approach aims to identify potential vulnerabilities proactively and provide your users with timely alerts and recommendations, avoiding reactive escalations and other damages. By implementing a proactive security monitoring and alerting system, users can receive personalized notifications in preferred channels like email, SMS, or push notifications. These alerts concisely summarize the identified security issues and provide succinct troubleshooting steps to fix the problem promptly, without the need for escalation.

GuardDuty is a threat detection service that continuously monitors for malicious activity and unauthorized behavior across your AWS environment. GuardDuty combines machine learning (ML), anomaly detection, and malicious file discovery, using both AWS and industry-leading third-party sources, to help protect AWS accounts, workloads, and data. GuardDuty integrates with [Amazon EventBridge](https://aws.amazon.com/eventbridge/) by creating an event for EventBridge for new generated vulnerability findings. This solution uses a GuardDuty findings notification through EventBridge to invoke [AWS Step Functions](https://aws.amazon.com/step-functions/), a serverless orchestration engine, which runs a state machine. The Step Functions state machine invokes [AWS Lambda](https://aws.amazon.com/lambda/) functions to get a findings summary and remediation steps through Amazon Bedrock.

Amazon Bedrock is a fully managed service that offers a choice of high-performing foundation models (FMs) from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Stability AI, and Amazon through a single API, along with a broad set of capabilities to build generative AI applications with security, privacy, and responsible AI.

By using [generative AI](https://aws.amazon.com/ai/generative-ai/) FMs on Amazon Bedrock, users can quickly analyze vast amounts of security data to identify patterns and anomalies that may indicate potential threats or breaches. Furthermore, by recognizing patterns in network traffic, user behavior, or system logs, such FMs can help identify suspicious activities or security vulnerabilities. Generative AI can make predictions about future security threats or attacks by analyzing historical security data and trends. This can help organizations proactively implement security measures to prevent breaches before they occur. This form of automation can help improve efficiency and reduce the response time to security threats.

## Solution overview

The solution uses the built-in integration between GuardDuty and EventBridge to raise an event notification for any new vulnerability findings in your AWS accounts or workloads. You can configure the EventBridge rule to filter the findings based on severity so that only high-severity findings are prioritized first. The EventBridge rule invokes a Step Functions workflow. The workflow invokes a Lambda function and passes the GuardDuty findings details. The Lambda function calls Anthropic’s Claude 3 Sonnet model through Amazon Bedrock APIs with the input request. The API returns the finding summarization and mitigation steps. The Step Functions workflow sends findings and remediation notifications to the subscribers or users using [Amazon Simple Notification Service](https://aws.amazon.com/sns/) (Amazon SNS). In this post, we use email notification, but you can extend the solution to send mobile text or push notifications.

The solution uses the following key services:

- **Amazon Bedrock** – The solution integrates with Anthropic’s Claude 3 Sonnet model to provide summarized visibility into security vulnerabilities and troubleshooting steps.
- **Amazon EventBridge** – EventBridge is a serverless event bus that helps you receive, filter, transform, route, and deliver events.
- **Amazon GuardDuty** – The solution uses the threat detection capabilities of GuardDuty to identify and respond to threats.
- **IAM** – With [AWS Identity and Access Management](https://aws.amazon.com/iam/) (IAM), you can specify who or what can access services and resources in AWS, centrally manage fine-grained permissions, and analyze access to refine permissions across AWS. Follow the [principle of least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) to safeguard your workloads.
- **AWS Lambda** – Lambda is a compute service that runs your code in response to events and automatically manages the compute resources, making it the fastest way to turn an idea into a modern, production, serverless application.
- **Amazon SNS** – Amazon SNS is a managed service that provides message delivery from publishers to subscribers.
- **AWS Step Functions** – Step Functions is a visual workflow service that helps developers use AWS services to build distributed applications, automate processes, orchestrate microservices, and create data and ML pipelines.

The following diagram illustrates the solution architecture.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.33.09%E2%80%AFPM.png)

The workflow includes the following steps:

1. GuardDuty invokes an EventBridge rule. The rule can filter the findings based on severity.
	1. The findings are also exported to an [Amazon Simple Storage Service](https://aws.amazon.com/s3/) (Amazon S3) bucket.
2. The EventBridge rule invokes a Step Functions workflow.
3. The Step Functions workflow calls a Lambda function to get the details of the vulnerability findings.
4. The Lambda function creates a prompt with the vulnerability details and passes it to Anthropic’s Claude 3 using Amazon Bedrock APIs. The function returns the response to the Step Functions workflow.
5. The Step Functions workflow calls an SNS topic with the findings details to send an email notification to subscribers. You can use your support or operations team as the subscriber for this use case.
6. Amazon SNS sends the email to the subscribers.
7. The Step Functions workflow and Lambda function logs are stored in [Amazon CloudWatch](https://aws.amazon.com/cloudwatch). For more details, see [Configure logging in the Step Functions console to store logs in CloudWatch](https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html). By default, [CloudWatch logs use server-side encryption for the log data at rest](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html).

## Solution benefits

The solution provides the following benefits for end-users:

- **Real-time visibility** – The intuitive omnichannel support solution provides a comprehensive view of your cloud environment’s security posture
- **Actionable insights** – You can drill down into specific security alerts and vulnerabilities generated using generative AI to prioritize and respond effectively
- **Proactive customizable reporting** – You can troubleshoot various errors before escalation by retrieving a summary of reports with action recommendations

## Prerequisites

Complete the following prerequisite steps:

1. [Enable GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_settingup.html) in your account to generate findings.
2. Provision least privilege [IAM permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html) for AWS resources like Step Functions and Lambda functions to perform desired actions:
	1. The Step Functions IAM role should have IAM policies to invoke the Lambda function and [publish to the SNS topic](https://docs.aws.amazon.com/step-functions/latest/dg/connect-sns.html).
		2. The Lambda function needs [AWSLambdaBasic ExecutionRole](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html) to publish logs and the [bedrock:InvokeModel](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html)
		3. Edit the [access policy of the SNS topic](https://docs.aws.amazon.com/sns/latest/dg/sns-access-policy-use-cases.html) to only allow Step Functions to publish messages to the topic.
3. [Request access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html) to Anthropic’s Claude 3 on Amazon Bedrock.
4. Turn on encryption at the SNS topic to enable [server-side encryption](https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html).

## Deploy the solution

Complete the following steps to deploy the solution:

1. On the EventBridge console, create a new rule for GuardDuty findings notifications.

The example rule in the following screenshot filters high-severity findings at severity level 8 and above. For a complete list of GuardDuty findings, refer to the [GetFindings](https://docs.aws.amazon.com/guardduty/latest/APIReference/API_GetFindings.html#API_GetFindings_ResponseSyntax) API.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.34.06%E2%80%AFPM.png)

2. On the Lambda console, create a Lambda function that will take the findings as the input and call the Amazon Bedrock API to get the summarization and mitigation steps from Anthropic’s Claude 3.

You need to provide proper IAM permissions to your Lambda function to call Amazon Bedrock APIs. You can configure parameters in the environment variables in the Lambda function. The following function uses three configuration parameters:

- `modelId` is set as `claude-3-sonnet-20240229-v1:0`
- `findingDetailType` is set as GuardDuty finding to filter the payload
- `source` is set as `guardduty` to only evaluate GuardDuty findings

```python
import json
import boto3
import urllib.parse
import os

region = os.environ['AWS_REGION']
model_Id = os.environ['modelId']
finding_detail_type = os.environ['findingDetailType']
finding_source = os.environ['source']

# Bedrock client used to interact with APIs around models
bedrock = boto3.client(service_name='bedrock', region_name= region)

# Bedrock Runtime client used to invoke and question the models
bedrock_runtime = boto3.client(service_name='bedrock-runtime', region_name= region)

evaluator_response = []
max_tokens=512
top_p=1
temp=0.5
system = ""

def lambda_handler(event, context):
    message = ""
    try:
        file_body = json.loads(json.dumps(event))
        print(finding_detail_type)
        print(finding_source)
        if file_body['detail-type'] == finding_detail_type and file_body['source'] == finding_source and file_body['detail']:
            print(f'File contents: {file_body['detail']}')
            description = file_body["detail"]["description"]
            finding_arn = file_body["detail"]["arn"]
            try:
                body= createBedrockRequest(description)
                message = invokeModel(body)
                print(message)
                evaluator_response.append(message)
                evaluator_response.append(finding_arn)
            except Exception as e:
                print(e)
                print('Error calling model')
        else:
            message = "Invalid finding source"
    except Exception as e:
        print(e)
        print('Error getting finding id from the guard duty record')
        raise e
    return message

def createBedrockRequest(description):
    prompt = "You are an expert in troubleshooting AWS logs and sharing details with the user via an email draft as stated in <description>. Do NOT provide any preamble. Draft a professional email summary of details as stated in description. Write the recipient as - User in the email and sender in the email should be listed as - Your Friendly Troubleshooter. Skip the preamble and directly start with subject. Also, provide detailed troubleshooting steps in the email draft." + "<description>" + description + "</description>"
    messages = [{ "role":'user', "content":[{'type':'text','text': prompt}]}]
    body=json.dumps(
             {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "messages": messages,
                "temperature": temp,
                "top_p": top_p,
                "system": system
            } 
        )
    return body

def invokeModel(body):
    response = bedrock_runtime.invoke_model(body= body, modelId = model_Id)
    response_body = json.loads(response.get('body').read())
    message = response_body.get('content')[0].get("text")
    return message
```

It’s crucial to perform prompt engineering and follow prompting best practices in order to avoid hallucinations or non-coherent responses from the LLM. In our solution, we created the following prompt to generate responses from Anthropic’s Claude 3 Sonnet:

` Prompt = ```You are an expert in troubleshooting AWS logs and sharing details with the user via an email draft as stated in <description>. Do NOT provide any preamble. Draft a professional email summary of details as stated in description. Write the recipient as - User in the email and sender in the email should be listed as - Your Friendly Troubleshooter. Skip the preamble and directly start with subject. Also, provide detailed troubleshooting steps in the email draft." + "<description>" + description + "</description>``` `

The prompt makes sure the description of the issue under consideration is categorized appropriately within XML tags. Further emphasis has been provided upon jumping directly into generating the answer and skipping any additional information that may be generated from the model.

3. On the Amazon SNS console, create an SNS topic to send notifications and add the emails of the subscribers.

The following screenshot shows the topic details with some test subscribers.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.34.59%E2%80%AFPM.png)

Now you can create the Step Functions state machine and integrate the Lambda and Amazon SNS calls in the workflow.

4. On the Step Functions console, create a new state machine and add the Lambda and Amazon SNS optimized integration.

You need to provide appropriate IAM permissions to the Step Functions role so it can call Lambda and Amazon SNS.

The following diagram illustrates the Step Functions state machine.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.35.25%E2%80%AFPM.png)

The following sample code shows how to use the Step Functions optimized integration with Lambda and Amazon SNS.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.35.56%E2%80%AFPM.png)

5. On the EventBridge console, add the Step Functions state machine as the target of the EventBridge rule created earlier.

As seen in the following screenshot, the rule needs to have proper IAM permission to invoke the Step Functions state machine.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.36.29%E2%80%AFPM.png)

## Test the solution

You can test the setup by generating some sample findings on the GuardDuty console. Based on the sample findings volume, the test emails will be triggered accordingly.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.36.59%E2%80%AFPM.png)

Based on a sample generation, the following screenshot shows an email from Amazon SNS about a potential security risk in an [Amazon Elastic Container Service](https://aws.amazon.com/ecs) (Amazon ECS) cluster. The email contains the vulnerability summary and a few mitigation steps to remediate the issue.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.38.08%E2%80%AFPM.png)

The following screenshot is a sample email notification about a potential Bitcoin IP address communication.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/08/Screenshot-2024-11-07-at-4.41.07%E2%80%AFPM.png)

This proactive approach enables users to take immediate action and remediate vulnerabilities before they escalate, reducing the risk of data breaches or security incidents. It empowers users to maintain a secure environment within their AWS accounts, fostering a culture of proactive security awareness and responsibility. Furthermore, a proactive security vulnerability assessment and remediation system can streamline the resolution process, minimizing the time and effort required to address security concerns.

## Clean up

To avoid incurring unnecessary costs, complete the following steps:

1. Delete the following AWS resources associated with this solution:
	1. Step Functions state machine
		2. Lambda functions
		3. SNS topic
2. You can disable GuardDuty if you’re no longer using it to avoid S3 bucket storage cost.

By cleaning up the resources created for this solution, you can prevent any ongoing charges to your AWS account.

## Conclusion

By providing users with clear and actionable recommendations, they can swiftly implement the necessary fixes, reducing the likelihood of untracked or lost tickets and enabling swift resolution. Adopting this proactive approach not only enhances the overall security posture of AWS accounts, but also promotes a collaborative and efficient security practice within the organization, fostering a sense of ownership and accountability among users.

You can deploy this solution and integrate it with other services to have a holistic omnichannel solution. To learn more about Amazon Bedrock and AWS generative AI services, refer to the following workshops:

- [Amazon Bedrock Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/a4bdb007-5600-4368-81c5-ff5b4154f518/en-US)
- [Amazon Q Developer Deep Dive](https://catalog.us-east-1.prod.workshops.aws/workshops/e2226eb6-f109-47ae-b2c5-f02bf73b7d0e/en-US)

---

### About the Authors

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2022/10/25/shikhar-300x297-1.png) [Shikhar Kwatra](https://www.linkedin.com/in/shikharkwatra/) is a Sr. Partner Solutions Architect at Amazon Web Services, working with leading Global System Integrators. He has earned the title of one of the Youngest Indian Master Inventors with over 500 patents in the AI/ML and IoT domains. Shikhar aids in architecting, building, and maintaining cost-efficient, scalable cloud environments for the organization, and support the GSI partners in building strategic industry solutions on AWS.

![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2024/11/11/rajdban.png) Rajdeep Banerjee is a Senior Partner Solutions Architect at AWS helping strategic partners and clients in the AWS cloud migration and digital transformation journey. Rajdeep focuses on working with partners to provide technical guidance on AWS, collaborate with them to understand their technical requirements, and designing solutions to meet their specific needs. He is a member of Serverless technical field community. Rajdeep is based out of Richmond, Virginia.