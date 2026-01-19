import fs from 'fs';

// Read the OpenAPI spec
const spec = JSON.parse(fs.readFileSync('opt/wildcat/openapi.json', 'utf8'));

// Add the missing ListSort schema
if (!spec.components.schemas.ListSort) {
    spec.components.schemas.ListSort = {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order for list queries'
    };
    console.log('Added missing ListSort schema');
} else {
    console.log('ListSort schema already exists');
}

// Write back with proper formatting
fs.writeFileSync('opt/wildcat/openapi.json', JSON.stringify(spec, null, 2));

console.log('OpenAPI spec fixed and saved');
