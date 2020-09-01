FROM nginx:latest

EXPOSE 80 443

RUN mkdir -p /archive/static/
RUN mkdir -p /archive/host/
RUN mkdir -p /etc/nginx/snippets/

COPY nginx.conf /etc/nginx/nginx.conf
COPY self-signed.conf /etc/nginx/snippets/self-signed.conf
COPY ssl-params.conf /etc/nginx/snippets/ssl-params.conf