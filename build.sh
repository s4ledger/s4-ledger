#!/bin/bash
set -e
cd prod-app && npm install && npm run build && cd ..
cd demo-app && npm install && npm run build && cd ..
cd S4-DemoApplication && npm install && npm run build && cd ..
cp demo-app/dist/index.html demo-app/index.html
cp S4-DemoApplication/dist/index.html S4-DemoApplication/index.html
rm -f demo-app/index.monolith.html demo-app/demo.html prod-app/index.html
