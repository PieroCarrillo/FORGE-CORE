# AWS Security Groups

Use two EC2 instances in the same VPC.

## App Server security group

- Inbound TCP 22 from your public IP only.
- Inbound TCP 80 from `0.0.0.0/0`.
- Inbound TCP 443 from `0.0.0.0/0` if TLS is configured.
- Outbound TCP 3306 to the Database Server security group.
- Outbound TCP 80/443 for package updates and external video assets.

## Database Server security group

- Inbound TCP 22 from your public IP only, or from a bastion if available.
- Inbound TCP 3306 only from the App Server security group.
- No public HTTP/HTTPS inbound rules.

## Notes

- MariaDB must use the private IP path between instances.
- Do not expose port 3306 to the internet.
- AWS security groups are stateful firewalls for EC2 instances:
  https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
