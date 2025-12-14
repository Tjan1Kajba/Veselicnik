FROM node:20-alpine

WORKDIR /app



COPY package.json package-lock.json ./
RUN npm install && npm install toastify-js --save
RUN npm install toastify-js --save

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
