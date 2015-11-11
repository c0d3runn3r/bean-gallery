FROM debian:jessie
RUN apt-get update && apt-get install curl -y
RUN curl --silent --location https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get install --yes nodejs
COPY . / 
CMD ["npm", "install"]
EXPOSE 80
CMD ["node", "server.js"]
