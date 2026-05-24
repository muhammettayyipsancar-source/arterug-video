services:
  - type: web
    name: arterug-video
    env: node
    plan: starter
    buildCommand: apt-get install -y ffmpeg && npm install
    startCommand: node server.js
