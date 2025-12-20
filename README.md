# SSDD Terminal

A Node.js (Express) demo app with CI pipeline in Jenkins performing SAST (SonarQube) and DAST (OWASP ZAP).

## Overview
- Build runs inside Docker (`node:18-alpine`).
- SAST uses the SonarScanner Docker image (`sonarsource/sonar-scanner-cli:5`).
- DAST runs OWASP ZAP baseline scan from a separate "DAST" machine via SSH.
- DAST reports (`zap-report.html`, `zap-report.md`, `zap-report.json`) are archived as Jenkins artifacts.

## Project Structure
- App entry: `server.js`
- Static assets: `public/`
- Pipeline: `Jenkinsfile`

## Prerequisites
- Jenkins with Docker installed on the build agent
- SonarQube server reachable from Jenkins
- SSH access from Jenkins to the DAST machine

## Required Jenkins Configuration
- Credentials:
	- `sonar-token`: SonarQube token (Kind: Secret text or appropriate Sonar plugin credential)
	- `zap-ssh`: SSH Username with private key for the DAST machine user (e.g., `ubuntu`)
- Plugins:
	- Docker Pipeline
	- SonarQube Scanner for Jenkins
	- NodeJS (optional if you run Node via Docker only)
- SonarQube server in Jenkins: Manage Jenkins → Configure System → SonarQube Servers

### SonarQube Webhook (recommended)
- In SonarQube: Administration → Configuration → Webhooks → Create
- Name: `Jenkins`
- URL: `http://<jenkins-host>:8080/sonarqube-webhook/`
- Purpose: Allows `waitForQualityGate()` to return immediately after analysis completes.

## Environment (example)
- Jenkins (build/app host):
	- Public: `18.221.94.30`
	- Private: `172.31.16.61`
- DAST (ZAP) host:
	- Public: `18.118.208.4`

The pipeline starts the app on Jenkins and scans `http://172.31.16.61:3001/`.

## Pipeline Stages (Jenkinsfile)
1. Checkout: Pulls repo from GitHub
2. Pull Docker Image: Ensures `node:18-alpine` is available
3. Install Dependencies: `npm install` inside Docker
4. SAST: Runs SonarScanner container and pushes analysis to SonarQube
5. Quality Gate: Logs gate result (continues on ERROR/timeout)
6. Build Application: `npm install --production`
7. Start Application: Runs app in a Docker container and health-checks `http://localhost:3001`
8. DAST (OWASP ZAP): SSH to DAST host and run `zap-baseline.py` against Jenkins app
9. Post: Stops and removes the app container, cleans workspace

## DAST Reports Location
- After a successful DAST stage, reports are archived as build artifacts:
	- `zap-report.html` (full HTML report)
	- `zap-report.md` (summary)
	- `zap-report.json` (machine-readable)

### Accessing Artifacts
- Jenkins UI → Job → Build # → Artifacts
- Direct URL pattern:
	- `http://<jenkins-host>:8080/job/SSDD-terminal/<build-number>/artifact/zap-report.html`

## Running Locally
Install dependencies and start the app:

```bash
npm install
npm start
# App runs on http://localhost:3001
```

## Troubleshooting
- Quality Gate waits too long:
	- Configure the SonarQube webhook to Jenkins
	- Or keep the non-blocking gate with a short timeout (pipeline continues)
- App fails to start in Docker:
	- The pipeline cleans `node_modules` and installs inside the container to avoid native binding mismatches (e.g., `sqlite3`).
	- Check container logs in Jenkins build output.
- DAST stage fails with missing credentials:
	- Create SSH credential `zap-ssh` with the private key for `ubuntu@18.118.208.4`.
- Reports missing:
	- Verify ZAP ran and produced `zap-report.*` files; artifacts are archived even if empty.

## Useful Commands
- Rebuild Docker images on DAST host:
```bash
ssh ubuntu@18.118.208.4 "docker pull owasp/zap2docker-stable"
```
- Verify app is reachable on Jenkins:
```bash
curl -I http://172.31.16.61:3001/
```

## Security Notes
- CSP is configured with `frameAncestors` and `blockAllMixedContent` via Helmet.
- CSRF protection uses `csurf` with secure cookie options.
- Fetch Metadata middleware blocks cross-site unsafe requests.
- This is an educational demo; review dependencies and security hotspots in SonarQube regularly.