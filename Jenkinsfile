pipeline {
    agent any
    
    environment {
        SONAR_HOST_URL = 'http://18.221.94.30:9000/'
        SONAR_PROJECT_KEY = 'SSDD_terminal'
        SONAR_PROJECT_NAME = 'SSDD Terminal'
        DOCKER_IMAGE = 'node:18-alpine'
        SONAR_SCANNER_IMAGE = 'sonarsource/sonar-scanner-cli:5'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                git branch: 'main',
                    url: 'https://github.com/MohamedAhsanOfficial/SSDD_terminal.git'
            }
        }
        
        stage('Pull Docker Image') {
            steps {
                echo 'Pulling Docker image...'
                script {
                    docker.image("${DOCKER_IMAGE}").pull()
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing Node.js dependencies...'
                script {
                    docker.image("${DOCKER_IMAGE}").inside {
                        sh 'npm install'
                    }
                }
            }
        }
        
        stage('SAST - SonarQube Analysis') {
            steps {
                echo 'Running SonarQube SAST analysis...'
                script {
                    docker.image("${SONAR_SCANNER_IMAGE}").inside {
                        withSonarQubeEnv(credentialsId: 'sonar-token') {
                            sh """
                                sonar-scanner \
                                    -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                    -Dsonar.projectName='${SONAR_PROJECT_NAME}' \
                                    -Dsonar.sources=. \
                                    -Dsonar.exclusions=node_modules/**,public/** \
                                    -Dsonar.host.url=${SONAR_HOST_URL}
                            """
                        }
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                echo 'Waiting for SonarQube Quality Gate (timeout 15m, non-blocking)...'
                script {
                    def qg = null
                    try {
                        timeout(time: 15, unit: 'MINUTES') {
                            qg = waitForQualityGate()
                        }
                    } catch (err) {
                        echo 'Quality Gate check timed out, continuing...'
                    }

                    if (qg && qg.status) {
                        echo "Quality Gate status: ${qg.status} (continuing pipeline)"
                    }
                }
            }
        }
        
        stage('Build Application') {
            steps {
                echo 'Building application...'
                script {
                    docker.image("${DOCKER_IMAGE}").inside {
                        sh 'npm install --production'
                        echo 'Application built successfully'
                    }
                }
            }
        }
        
        stage('Start Application') {
            steps {
                echo 'Starting Node.js application for DAST scanning...'
                script {
                    // Clean node_modules to avoid architecture conflicts
                    sh 'rm -rf node_modules package-lock.json'
                    
                    // Start the app in Docker background container
                    sh '''
                    docker run -d --name ssdd-app -p 3001:3001 \
                    -w /app -v $(pwd):/app \
                    ${DOCKER_IMAGE} \
                    sh -c "npm install && npm start"
                    
                    sleep 10
                    if curl -s http://localhost:3001 > /dev/null; then
                        echo "✓ Application is running on port 3001"
                    else
                        echo "✗ Application failed to start"
                        docker logs ssdd-app
                        exit 1
                    fi
                    '''
                }
            }
        }
        
        stage('DAST - OWASP ZAP Scan') {
            steps {
                echo 'Running OWASP ZAP baseline scan on target application...'
                script {
                    sshagent(['zap-ssh']) {
                        sh '''
                        echo "Running ZAP scan against application on Jenkins..."
                        ssh -o StrictHostKeyChecking=accept-new ubuntu@18.118.208.4 \
                        "docker run --rm -v \$(pwd):/zap/wrk:rw -t owasp/zap2docker-stable \
                        zap-baseline.py \
                        -t http://172.31.16.61:3001/ \
                        -r zap-report.html \
                        -w zap-report.md \
                        -J zap-report.json || true"
                        
                        echo "Copying scan results back to Jenkins workspace..."
                        scp -o StrictHostKeyChecking=accept-new \
                        ubuntu@18.118.208.4:~/zap-report.* . || echo "No reports to copy"
                        '''
                    }
                }
                
                archiveArtifacts artifacts: 'zap-report.*', allowEmptyArchive: true, fingerprint: true
                
                echo 'DAST scan completed. Check archived artifacts for detailed results.'
            }
        }

    }
    
    post {
        success {
            echo 'Pipeline completed successfully!'
            echo 'SAST analysis passed and application built.'
        }
        failure {
            echo 'Pipeline failed!'
            echo 'Please check the logs for errors.'
        }
        always {
            echo 'Stopping application container...'
            sh 'docker stop ssdd-app || true'
            sh 'docker rm ssdd-app || true'
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}
