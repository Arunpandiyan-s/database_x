const app = require('./app');

const routes = [];
function extractRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            routes.push(`  ${methods.padEnd(8)} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            const match = layer.regexp.toString().match(/\/(\w[-\w\/]*)/);
            const sub = match ? '/' + match[1] : '';
            extractRoutes(layer.handle.stack, prefix + sub);
        }
    });
}

extractRoutes(app._router.stack);
console.log('=== Registered Routes ===');
routes.forEach(r => console.log(r));
console.log(`\nTotal: ${routes.length} routes`);
process.exit(0);
