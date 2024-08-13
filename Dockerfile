# Use an official Node.js image
FROM node:18

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV DISCORD_TOKEN=your-discord-token

# Run the bot
CMD ["node", "dist/main.js"]
