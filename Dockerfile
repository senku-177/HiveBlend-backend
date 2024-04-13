# Use the Node.js base image
FROM node:latest

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of your application
COPY . .

# Expose the port that your Node.js app runs on
EXPOSE 9001

# Install MongoDB
RUN apt-get update && apt-get install -y mongodb

# Create a directory to store MongoDB data
RUN mkdir -p /data/db

# Start MongoDB
CMD ["mongod", "--bind_ip", "0.0.0.0", "--port", "27017", "--dbpath", "/data/db", "--fork", "--logpath", "/var/log/mongodb.log"]

# Command to run your Node.js server
CMD ["npm", "start"]
