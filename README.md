##  GAD Information Management System
### **Group 6**

This repository contains the **Gender and Development (GAD) Information Management System**, featuring a Node.js backend, React frontend, and a Dockerized MongoDB database.


###  Project Structure
We follow a **Flat Directory Structure** for seamless integration and deployment. This ensures the application is ready for production environments.

*  **`/src`** — Backend server logic, API routes, and database configuration.
*  **`/public`** — Frontend assets and static files.
*  **`Dockerfile` & `docker-compose.yml`** — Infrastructure as Code for environment setup.
*  **`package.json`** — Project dependencies and build scripts.


###  Getting Started

### 1. Prerequisites
* **Node.js** (v18 or higher)
* **Docker Desktop** (for database containerization)

### 2. Infrastructure Setup (Docker)
To start the database environment, run the following in your terminal:

docker-compose up -d

This starts the MongoDB container on port 27017.

### Application SetupInstall dependencies and start the development server:
npm install
npm start
The server will be available at http://localhost:4000.



### Team, please follow these steps to upload your code:

Clone the repo: git clone <url> (if they haven't yet).

Move to develop: git checkout develop

Pull updates: git pull origin develop

Create your feature branch: git checkout -b feature/your-name-feature

Add your files, then run:

git add .

git commit -m "Finished [feature name]"

git push origin feature/your-name-feature
