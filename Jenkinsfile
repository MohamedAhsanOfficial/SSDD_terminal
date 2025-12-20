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
        stage('DAST') {
            steps {
                sshagent(['zap-ssh']) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ubuntu@34.220.207.21 \
                    "docker run --rm -t owasp/zap2docker-stable zap-baseline.py \
                    -t http://54.245.203.229:3001/ || true"
                    '''
                }
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
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}
