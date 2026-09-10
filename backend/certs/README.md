# Aurora TLS trust

`ap-northeast-2-bundle.pem` is a **public CA bundle**, not a private key.

- Source: https://truststore.pki.rds.amazonaws.com/ap-northeast-2/ap-northeast-2-bundle.pem
- SHA-256: `913fb5b814f17af79d4c1622584a8d0ceddf5b0d76fe353d0c7d1186cdd6b229`
- [AWS region certificate documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)

The ECS JDBC URL uses `sslmode=verify-full` and this file inside the image.
Before an AWS CA rotation, review the official bundle, replace this file and its
checksum, rebuild the image and roll out the new task before rotating the server.
Do not disable certificate or hostname verification to work around a TLS error.
