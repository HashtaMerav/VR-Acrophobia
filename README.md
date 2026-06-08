# VR-Acrophobia

A virtual reality exposure therapy system for treating acrophobia (fear of heights).

## Overview

The project combines:

* Unity VR environment
* Smartwatch heart-rate monitoring
* FastAPI backend
* PostgreSQL database
* React web application
* Therapist decision support

The system analyzes physiological data collected during VR sessions and generates recommendations regarding patient progression.

## Main Features

### Patient Dashboard

* View current therapy level
* View stress level
* View system recommendation
* View therapist decision

### Therapist Dashboard

* View patient information
* View VR session activity
* View heart-rate measurements
* View heart-rate graph
* View session analysis
* Approve or override recommendations

### Analysis System

* Baseline heart-rate comparison
* Stress level calculation
* Automatic recommendation generation
* Therapist approval workflow

## Technologies

* React
* FastAPI
* PostgreSQL
* Unity
* Meta Quest
* Samsung Galaxy Watch


## Project Structure

client/   -> React frontend
server/   -> FastAPI backend


## Run Frontend

cd client
npm install
npm run dev

Frontend runs on: http://localhost:5173


## Run Backend

Connect to the Linux server:

ssh student@46.224.136.108

Enter the server password when prompted.

After connecting, start the FastAPI server:

uvicorn main:app --host 0.0.0.0 --port 8000

Backend URL:

http://46.224.136.108:8000

Swagger API Documentation:

http://46.224.136.108:8000/docs



## Environment Variables

Create:

server/.env

Example:

DATABASE_URL=your_database_connection_string

The `.env` file is excluded from GitHub for security reasons.


## Authors

Software Engineering Final Project

VR-Based Acrophobia Therapy System
