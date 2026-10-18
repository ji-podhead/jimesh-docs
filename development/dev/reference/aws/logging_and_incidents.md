https://aws.amazon.com/blogs/security/logging-strategies-for-security-incident-response/

Effective security incident response depends on adequate [logging](https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/logging-and-events.html), as described in the [AWS Security Incident Response Guide](https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/aws-security-incident-response-guide.html). If you have the proper logs and the ability to query them, you can respond more rapidly and effectively to security events. If a security event occurs, you can use various log sources to validate what occurred and understand the scope. Then, you can use the results of your analysis to take remediation actions. To learn more about logging best practices, see [Configure service and application logging](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/sec_detect_investigate_events_app_service_logging.html) and [Analyze logs, findings, and metrics centrally](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/sec_detect_investigate_events_analyze_all.html).

In this blog post, we will show you how to achieve an effective strategy for logging for security incident response. We will share logging options across the typical cloud application stack, log analysis options, and sample queries. AWS offers managed services, such as [Amazon GuardDuty](https://aws.amazon.com/guardduty/) for threat detection and [Amazon Detective](https://aws.amazon.com/detective/) for incident analysis. If you want to collect additional logs or perform custom analysis, then you should consider the options described in this blog post.

## Selection of logs

To select the appropriate logs for security incident response, you should start with the common cloud application stack, which consists of the components and layers of your application deployed on AWS. For each component, we will describe the logging sources that you have. For each log source, we will describe why you should log it for security incident response, how to enable the logs, and what your log storage options are.

To select the logs for security incident response, first consider the following questions:

- What are your compliance and regulatory requirements for logging?  
	> **Note:** Make sure that you comply with the log retention requirements of compliance standards relevant to your organization, as well as your organization’s incident response strategy.
- What AWS services do you commonly use?
- What AWS services have access to or contain sensitive data?
- What threats are most relevant to you?  
	> **Note:** Performing a threat model of your cloud architectures can help you answer this question. For more information, see [How to approach threat modelling](https://aws.amazon.com/blogs/security/how-to-approach-threat-modeling/).

Considering these questions can help you develop requirements for logging that will guide your selection of the following log sources.

## AWS account logs

An AWS account is the first, fundamental component of an application deployed on AWS. The account is a container for your AWS resources. You create and manage your AWS resources in this account, and the account provides administrative capabilities for access and billing.

### AWS CloudTrail

Within an account, each action performed is an API call. From a console sign-in to the deployment of each resource in an [AWS CloudFormation](https://aws.amazon.com/cloudformation/) stack, events are generated to provide transparency on what has occurred in the account. With [AWS CloudTrail](https://aws.amazon.com/cloudtrail/), you can log, continuously monitor, and retain account activity related to actions across [supported AWS services](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-aws-service-specific-topics.html). CloudTrail provides the event history of your account activity, including actions taken through the [AWS Management Console](https://aws.amazon.com/console/), [AWS SDKs](https://aws.amazon.com/developer/tools/), command line tools, and other AWS services. CloudTrail logs API calls as three types of events:

- [**Management events**](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html#cloudtrail-concepts-management-events) (also known as *control plane operations*) show management operations that are performed on resources in your account. This includes actions like creating an [Amazon Simple Storage Service (Amazon S3)](https://aws.amazon.com/s3/) bucket and setting up logging.
- [**Data events**](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html#cloudtrail-concepts-data-events) (also known as *data plane operations*) show the resource operations performed on or within resources in your account. These operations are often high-volume activities, such as Amazon S3 object-level API activity (for example, GetObject, DeleteObject, and PutObject API operations) and [AWS Lambda](https://aws.amazon.com/lambda/) function invocation activity.
- [**Insights events**](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-insights-events.html) capture unusual API call rate or error rate activity in your account. You must enable these events on a trail in order to capture them, and they are logged to a different folder prefix in the destination S3 bucket for your trail. Insights events provide you with information such as the type of event, the incident time period, the associated API, the error code, and statistics to help you understand and respond effectively to unusual activity.

For security investigations, CloudTrail provides context on the creation, modification, and deletion of AWS resources. Therefore, CloudTrail is one of your most important log sources for security incident response in an AWS environment. You have three primary ways to set up CloudTrail:

- [**CloudTrail Event history**](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html) — CloudTrail is enabled by default with 90-day retention of management events that you can retrieve through the CloudTrail Event history facility using the console, [AWS Command line Interface (AWS CLI)](https://aws.amazon.com/cli/), or AWS SDK. You don’t need to take any action to get started using the Event history feature.
- [**CloudTrail trail**](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html) — For longer retention and visibility of data events, you need to create a CloudTrail trail and associate it with an S3 bucket and optionally with an [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) log group. If you use [AWS Organizations](https://aws.amazon.com/organizations/), you can create an organization trail that will log events for each account in the organization. By default, trails are multi-Region, so you don’t need to enable CloudTrail logs in each AWS Region.
- [**AWS CloudTrail Lake**](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake.html) — You can create a CloudTrail lake, which retains CloudTrail logs for up to seven years and provides a SQL-based querying facility. You don’t need to have a trail configured in your account to use CloudTrail Lake.
- [**Amazon Security Lake**](https://docs.aws.amazon.com/security-lake/latest/userguide/internal-sources.html) — You can use Security Lake to ingest CloudTrail events, which include management and data events. You can further analyze these events with [Amazon QuickSight](https://aws.amazon.com/quicksight/) or another other third-party security information and event management (SIEM) tool.

### AWS Config

Creating and modifying resources is an integral part of your account use. Tracking resource configuration changes made by calling the AWS API helps you review changes throughout the resource lifecycle. [AWS Config](https://aws.amazon.com/config/) provides a detailed view of the configuration of AWS resources in your account, examines the resource configurations periodically, and tracks configuration changes that were not initiated by the API. This includes how the resources are related to one another and how they were configured in the past so that you can see how configurations and relationships change over time.

You should enable AWS Config in each Region where you have resources deployed, and you should configure an S3 bucket to receive configuration history and configuration snapshot files, which contain details on the resources that AWS Config records. You can then review configuration compliance and analyze activities performed before, during, and after an event using the configuration history in S3. You should centralize AWS Config resource tracking across multiple accounts in the same organization by [setting up an aggregator](https://aws.amazon.com/blogs/mt/org-aggregator-delegated-admin/). You can use [AWS Control Tower to automate the setup](https://docs.aws.amazon.com/controltower/latest/userguide/config.html).

During a security investigation, you might want to understand how a resource configuration has changed over time. For example, you might want to investigate the changes to an S3 bucket policy before and after a security event that involves an S3 bucket. AWS Config provides a configuration history for resources that can help you track activities performed during a security event.

## Operating system and application logs

To record interactions with applications, you must capture operating system (OS) and application logs, especially custom logs generated by the application development framework. OS and local application logs are relevant for security events that involve an [Amazon Elastic Compute Cloud (Amazon EC2)](https://aws.amazon.com/ec2/) instance. These instances could be standalone, in an auto scaling group behind a load balancer, or compute workloads for [Amazon Elastic Container Service (Amazon ECS)](https://aws.amazon.com/ecs/) or an [Amazon Elastic Kubernetes Service (Amazon EKS)](https://aws.amazon.com/eks/) cluster. OS logs track privileged use, processes, login events, access to directory services, and file system activity on a server. To analyze a potential compromise to an EC2 instance, you will want to review the security event logs for Windows OS and the system logs for Linux-based OS.

With the [unified CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html), you can collect metrics and logs from EC2 instances and on-premises servers. The CloudWatch agent aggregates log data into [CloudWatch logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html), which can then be exported to Amazon S3 for long-term retention and analyzed with a SIEM tool of your choice or [Amazon Athena](https://aws.amazon.com/athena/), as shown in Figure 1.

![Figure 1: Aggregate OS and application logs using CloudWatch Logs](https://d2908q01vomqb2.cloudfront.net/22d200f8670dbdb3e253a90eee5098477c95c23d/2023/04/03/img1.jpg)

Figure 1: Aggregate OS and application logs using CloudWatch Logs

## Database logs

With SQL databases, you can log transactions to help track modifications to the databases, such as additions or deletions. After an engine or system failure, you will need transaction logs to restore a database to a consistent state. Transaction logs are designed to be secure, and they require additional processing to access valuable information. It’s important that you understand data interactions during a security investigation, especially if your databases hold personally identifiable information (PII), financial and payments information, or other information subject to regulatory controls.

When you use [Amazon Relational Database Service (Amazon RDS)](https://aws.amazon.com/rds/), you can [publish database logs to Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Procedural.UploadtoCloudWatch.html). For [NoSQL](https://aws.amazon.com/nosql/) databases, tracking atomic interactions is useful. You can find logs for managed NoSQL databases like [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) in CloudTrail. DynamoDB integrates with CloudTrail, providing a record of actions taken by a user, role, or service. These events are classified as data events in CloudTrail.

## Network logs

The goal of logging network activity is to gain insight into the communications that traverse your network. You might need this data for a variety of reasons, such as network troubleshooting or for use in a forensic investigation of suspected malware activity within your network.

In the AWS Cloud, you can log network activity by creating a proxy that logs network traffic or by using [Traffic Mirroring](https://docs.aws.amazon.com/vpc/latest/mirroring/what-is-traffic-mirroring.html) to send a copy of network traffic to a logging server. You can adopt cloud-native approaches to capture this type of data using [Amazon Route 53 DNS query logs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html) and [Amazon VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html).

There are also a variety of third-party networking solutions available like [Palo Alto Networks](https://partners.amazonaws.com/partners/001E0000013FeQXIA0/Palo%20Alto%20Networks) and [Fortinet](https://www.fortinet.com/products/public-cloud-security/aws?did=pa_card&trk=pa_card), so you can continue to use the network logging mechanisms that you might have used in an on-premises environment.

### Route 53 DNS query logs

You can configure [Amazon Route 53](https://aws.amazon.com/route53/) to log Domain Name System (DNS) queries. These logs are categorized into two groups:

- Public DNS query logging
- Resolver query logging

Logging public DNS queries against domains that you have hosted in Route 53 provides [query information](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html), such as the domain or subdomain requested, date and time stamp of the request, DNS record type, Route 53 edge location that responded, and response code.

The [Amazon Route 53 Resolver](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html) comes with [Amazon Virtual Private Cloud (Amazon VPC)](https://aws.amazon.com/vpc/) by default. Capturing Resolver query logs provides the same information as public queries, as well as additional information such as the Instance ID of the resource that the query originated from. You can also capture Resolver query logs against [different types of queries](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html).

### VPC Flow Logs

You can configure VPC Flow Logs for a VPC in your account to capture traffic that enters and moves around your VPC network, without the addition of instances or products. From these logs, you can review information, such as source and destination IP, ports, timestamps, protocol, account ID, and whether the traffic was accepted or rejected. For a complete list of the fields available for flow log records, see [Available fields](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html#flow-logs-fields). You can create a flow log for a VPC, a subnet, or a network interface. If you create a flow log for a subnet or VPC, IP traffic going to and from each network interface in that subnet or VPC will be logged. For more details on VPC Flow Logs, see [Logging IP traffic using VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html).

You can forward flow logs to [Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html) to create CloudWatch alarms based on metric filters. You can also forward flow logs to an S3 bucket for long-term retention and further analysis. Figure 2 demonstrates these configurations.

![Figure 2: Sending VPC Flow logs to CloudWatch Logs and S3](https://d2908q01vomqb2.cloudfront.net/22d200f8670dbdb3e253a90eee5098477c95c23d/2023/04/03/img2.jpg)

Figure 2: Sending VPC Flow logs to CloudWatch Logs and S3

## Access logs

To identify access patterns for accessible endpoints, especially public endpoints, you should use access logs. Access logs capture detailed information about requests sent to your load balancer. Each log contains information such as the time the request was received, the client’s IP address, latencies, request paths, and server responses. With services built in layers behind a load balancer, unless you track the X-Forwarded-For request header, the requestor’s context is lost. Access logs help bridge that gap during investigations and analysis.

### Amazon S3 server access logs

Access logs are critical to track object level access when using [S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html) to store confidential or sensitive data. You can also turn on CloudTrail to capture S3 data events. You can store access logs in S3 buckets for long-term storage for compliance purposes and to run analyses during and after an event.

### Load balancing logs

[Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/) provides access logs that capture detailed information about requests sent to load balancers. Each log contains information such as the time the request was received, the client’s IP address, latencies, request paths, and server responses. You can use this log to analyze traffic patterns and to troubleshoot issues.

Access logs is an optional feature of Elastic Load Balancing that is turned off by default. To enable access logs for load balancers, see [Access logs for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html).

If you implement your own reverse proxy for load balancing needs, make sure that you capture the reverse proxy access logs. You can use the [unified CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html) to forward the logs to CloudWatch. As with OS logs, you can export CloudWatch logs to an S3 bucket for long-term retention and analysis.

If you use an [Amazon CloudFront](https://aws.amazon.com/cloudfront/) distribution as the public endpoint for end users with load balancers as the custom origin, then load balancing access logs will represent the CloudFront distribution as the requestor, rather than the actual end user. If this information doesn’t add value to your incident handling process, then you can use [CloudFront access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) as the log source that provides end user request details.

### CloudFront access logs

You should enable standard logs, also known as access logs, when using CloudFront. Specify an S3 bucket where you want CloudFront to save the files.

CloudFront access logs are delivered on a best-effort basis. For information about requests made to a distribution in real time, use [real-time logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html) that are delivered within seconds of receiving the requests. You should use real-time logs to monitor, analyze, and take action based on content delivery performance. For more details on the fields available from these logs, see the [CloudFront standard log file format](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html#LogFileFormat).

### AWS WAF logs

When associated with a supported resource like a CloudFront distribution, [Amazon API Gateway](https://aws.amazon.com/api-gateway/) REST API, [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/), [AWS AppSync](https://aws.amazon.com/appsync/) GraphQL API, [Amazon Cognito](https://aws.amazon.com/cognito/) user pool, or [AWS App Runner](https://aws.amazon.com/apprunner/), [AWS WAF](https://aws.amazon.com/waf/) can help you monitor HTTP and HTTPS requests that are forwarded to the resource. You should configure web access control lists (ACLs) to gain fine-grained control over the requests, and enable logging for such ACLs to get detailed information about traffic that is analyzed by AWS WAF. Log information includes time of the request being received by AWS WAF from the AWS resource, details about the request, and the AWS WAF rules that the request matched. You can use this log information to monitor access patterns of public endpoints and configure rules to inspect requests in detail. For more information about AWS WAF logging, see [Logging web ACL traffic](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html).

## Serverless logs

Serverless computing has become increasingly popular in the cloud-computing space. It provides on-demand compute power in a relatively short burst, meaning that cloud-based instances don’t need to be provisioned and kept around, idle, when there are no tasks to be completed. Although more and more compute tasks are being moved to serverless solutions, the need to log has not changed, but how the logs are generated has. In a serverless environment, security investigations not only benefit from logs that demonstrate the interactions and changes made by the code deployed, but that also document changes to the deployed code itself and access permissions of the Lambda execution role that is granting privileged access.

### AWS Lambda

The logging of [Lambda](https://docs.aws.amazon.com/lambda/?id=docs_gateway) functions involves two components: how the function itself is operating, and what is happening inside the function (what your code is actually doing).

The logging of a Lambda function itself occurs through data events captured by CloudTrail. As noted earlier in this post, you must configure data events on a trail created in CloudTrail. During configuration, you will need to specify the function from which logs will be captured by your trail, and the destination S3 bucket where they will be stored. These logs contain details on the invocation of the function and help identify the IAM principals that called the Invoke API for Lambda.

AWS Lambda automatically monitors Lambda functions on your behalf and sends logs to CloudWatch. Your Lambda function comes with a CloudWatch Logs log group and a log stream for each instance of your function. The Lambda runtime environment sends details about each invocation to the log stream, and relays logs and other output from your function’s code. For more details on how to monitor Lambda functions, see [Accessing Amazon CloudWatch logs for AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html).

## Log analysis

For incident response, you need to be able to analyze and query your logs to validate what occurred and to understand the scope.

To begin, you can aggregate logs from various sources in S3 buckets for long-term storage, and you can integrate that data with query tools for further investigation. Logs can be exported and either parsed through directly, or ingested by another tool to help with the analysis. The following are some options that you can use to query these logs:

- [Amazon Athena](https://aws.amazon.com/athena/) — You can directly query CloudTrail events stored in S3 with Athena using SQL commands, specifying the `LOCATION` of the log files. You would generally use this approach if you have advanced queries to run, and you don’t have a SIEM. To set up Athena to query logs, you can use this [open-source solution](https://github.com/awslabs/aws-security-analytics-bootstrap) from AWS.
- [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service/) — OpenSearch is a distributed search and log analytics suite. Because it’s open source, it can ingest logs from more than just AWS log sources. To set this up, you can use this [open-source SIEM solution](https://github.com/aws-samples/siem-on-amazon-opensearch-service) from AWS.
- [CloudTrail](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/how-cloudtrail-works.html) Event History — Either from the console, or programmatically, you can query CloudTrail management events from the last 90-day period. This is ideal for when you have simple queries to make within the last 90 days, and you don’t need stored logs or more complex queries.
- [AWS CloudTrail Lake](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake.html) — Either from the console, or programmatically, you can query stored events in your configured CloudTrail Lake from the time of its configuration, up until the maximum storage duration of 2,557 days (7 years) from the time that you make your query. This approach allows for SQL-based queries, and it is ideal for when you need to make more complex queries against events, but don’t require the additional features of a SIEM solution.
- [Parse through raw JSON using CLI](https://aws.amazon.com/premiumsupport/knowledge-center/cloudtrail-search-api-calls/) — This is achieved programmatically and parsed through terminal commands. It’s more a legacy method of parsing through logs. You might choose to use this approach for analysis if another service or solution isn’t feasible (for example, if you can’t use the service due to your corporate security policy).
- Third-party SIEM — A third-party SIEM might be ideal if you already have a SIEM solution on AWS or elsewhere, and you don’t need a duplicated solution elsewhere. Typically, SIEM solutions will import logs from an S3 bucket and process and index events for analysis. To learn more about SIEM options, see the [SIEM solutions in the AWS Marketplace](https://aws.amazon.com/marketplace/solutions/control-tower/siem), or the [AWS Security Competency Partners](https://aws.amazon.com/security/partner-solutions/?blog-posts-cards.sort-by=item.additionalFields.createdDate&blog-posts-cards.sort-order=desc&partner-solutions-cards.sort-by=item.additionalFields.partnerNameLower&partner-solutions-cards.sort-order=asc&awsf.partner-solutions-filter-partner-type=*all&awsf.Filter%20Name%3A%20partner-solutions-filter-partner-categories=use-case%23threat-detection-mitigation&awsf.partner-solutions-filter-partner-location=*all&partner-case-studies-cards.sort-by=item.additionalFields.sortDate&partner-case-studies-cards.sort-order=desc&events-master-partner-webinars.sort-by=item.additionalFields.startDateTime&events-master-partner-webinars.sort-order=asc&awsm.page-partner-solutions-cards=2) for a partner local to you with threat detection and incident response (TDIR) expertise.

## Sample queries

In this section, we provide samples of SQL queries. Both Athena and CloudTrail Lake accept SQL queries, but the following samples have been tested for use in Athena only. This is because some samples are for VPC Flow Logs, which you can’t query from CloudTrail Lake. To query CloudTrail logs in Athena, you must first create a table definition that points to the location of your logs stored in S3. You can do this from the CloudTrail Events console by using a hyperlinked suggestion, or from the Athena console directly. Alternatively, for Athena, you can use the [AWS Security Analytics Bootstrap](https://github.com/awslabs/aws-security-analytics-bootstrap).

For each of these queries, you might need to modify some of the fields, such as the time frame that you are investigating, the IAM entity involved, and the account and Region in scope. For example, you might want to modify the time frame based on the current time and when you believe the security event began. This often involves expanding the time frame after running additional queries and learning more about the scope and timeline.

By using partitions for tables, you can restrict the amount of data scanned by each Athena query, helping to improve performance and reduce cost. For example, you can partition your CloudTrail Athena table [manually](https://docs.aws.amazon.com/athena/latest/ug/cloudtrail-logs.html#create-cloudtrail-table-org-wide-trail) or by using [partition projection](https://docs.aws.amazon.com/athena/latest/ug/cloudtrail-logs.html#create-cloudtrail-table-partition-projection). You can include the partition column (for example, the timestamp) in your queries to limit the amount of data scanned.

### Unauthorized attempts

When a security event occurs, you might want to review API calls that were attempted but failed due to the IAM principal not having access to perform the action on that resource. To discover this activity, run the following query (be sure to modify the time window first):

```
SELECT *
FROM cloudtrail
WHERE errorcode IN ('Client.UnauthorizedOperation','Client.InvalidPermission.NotFound','Client.OperationNotPermitted','AccessDenied')
AND useridentity.arn LIKE '%iam%'
AND eventtime >= '2023-01-01T00:00:00Z'
AND eventtime < '2023-03-01T00:00:00Z'
ORDER BY eventtime desc
```

This sample query can help you identify whether certain IAM principals have a significant amount of unauthorized API calls, which can indicate that an IAM principal is compromised.

### Rejected TCP connections

During a security event, the unauthorized user that is interacting with the resources in your account is probably trying to establish persistence through the network layer. To get a list of rejected TCP connections and extract from it the day that these events occurred, run the following query:

```
SELECT day_of_week(date) AS
day,date,interface_id,srcaddr,action,protocol
FROM vpc_flow_logs
WHERE action = 'REJECT' AND protocol = 6
LIMIT 100;
```

### Connections over older TLS versions

You might want to see how many calls to AWS APIs were made using older versions of the TLS protocol, as part of a forensic follow-up or a discovery job after a risk analysis. You can get this data by querying CloudTrail logs.

```
SELECT eventSource
COUNT(*) AS numOutdatedTlsCalls FROM cloudtrail WHERE tlsDetails.tlsVersion IN ('TLSv1', 'TLSv1.1') AND eventTime > '2023-01-01 00:00:00' GROUP BY eventSource ORDER BY numOutdatedTlsCalls DESC
```

### Filter connections from an IP

With an IP address that you’d like to investigate, as a part of your forensic analysis, you might want to see the connections made to resources in a VPC. You can obtain this information by querying VPC Flow Logs. As with the server access logs, if you’re using Athena, you will first need to [create a new table](https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs.html#vpc-flow-logs-partition-projection).

```
SELECT day_of_week(date) AS 
day, date, srcaddr, dstaddr, action, protocol
FROM vpc_flow_logs
WHERE day >= '2023/01/01' AND day < '2023/03/01' AND srcaddr LIKE '172.50.%'
ORDER BY day DESC
LIMIT 100
```

### Investigate user actions

If you have identified a user who has been compromised, or that you suspect has been compromised, you might want to know the API calls that they made over a specific time period. Understanding the activity of a user can help you understand the scope of impact during an incident, as well as the reach of user permissions when you design your access management strategy.

```
SELECT eventID, eventName, eventSource, eventTime, userIdentity.arn
AS user
FROM cloudtrail
WHERE userIdentity.arn = '%<username>%' AND eventTime > '2022-12-05 00:00:00' AND eventTime < '2022-12-08 00:00:00'
```

## Conclusion

It is essential that you capture logs from various layers within your application architecture, so that you can effectively respond to a security event at various layers of the application stack. If a security event occurs, logs can help provide a clear picture of what happened and the scope of the affected resources. This post helps you build a logging strategy for security incident response by understanding what logs you want to analyze, where you want to store those logs, and how you will analyze them.

## Further resources

- [AWS Security Incident Response Guide](https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/welcome.html)
- [AWS Security Analytics Bootstrap GitHub repository](https://github.com/awslabs/aws-security-analytics-bootstrap)
- [Remote Configuration, Installation, and Viewing of CloudWatch logs](https://www.wellarchitectedlabs.com/security/200_labs/200_remote_configuration_installation_and_viewing_cloudwatch_logs/)
- [AWS Knowledge Center – Query CloudTrail](https://aws.amazon.com/premiumsupport/knowledge-center/cloudtrail-event-history-changed/)
- [AWS Knowledge Center – Query specific API calls](https://aws.amazon.com/premiumsupport/knowledge-center/cloudtrail-search-api-calls/)
- [AWS Knowledge Center – Query VPC Flow Logs](https://aws.amazon.com/premiumsupport/knowledge-center/athena-analyze-vpc-flow-logs/)
- [AWS Knowledge Center – Create tables of CloudTrail events in Athena](https://aws.amazon.com/premiumsupport/knowledge-center/athena-tables-search-cloudtrail-logs/)

If you have feedback about this post, submit comments in the Comments section below. If you have questions about this post, start a new thread on the [AWS Security, Identity, & Compliance re:Post](https://repost.aws/topics/TAEEfW2o7QS4SOLeZqACq9jA/security-identity-compliance) or [contact AWS Support](https://console.aws.amazon.com/support/home).

**Want more AWS Security news? Follow us on [Twitter](https://twitter.com/AWSsecurityinfo "Twitter").**