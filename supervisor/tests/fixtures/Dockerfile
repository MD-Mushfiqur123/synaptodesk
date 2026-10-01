FROM oven/bun:1.3.14-slim
ARG FIXTURE_NAMESPACE
ARG FIXTURE_VARIANT
LABEL synaptodesk.test-fixture=$FIXTURE_NAMESPACE synaptodesk.test-variant=$FIXTURE_VARIANT
CMD ["bun", "-e", "Bun.serve({port:4100,fetch(request){return new Response('',{status:new URL(request.url).pathname === '/health' ? 200 : 404})}})"]
