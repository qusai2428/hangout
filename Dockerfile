FROM node:18-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json ./server/
RUN cd server && npm install

# Install client dependencies and build
COPY client/package.json ./client/
RUN cd client && npm install

# Copy all source files
COPY client/ ./client/
RUN cd client && npm run build

# Copy built frontend into server's static folder
RUN cp -r client/build server/build

# Copy server source
COPY server/ ./server/

EXPOSE 3001

CMD ["node", "server/index.js"]
