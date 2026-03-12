# Use official Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy server code and public assets
COPY . .

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start the server
CMD [ "npm", "start" ]
