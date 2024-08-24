import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
async function addJsExtensions(dir) {
    const files = await readdir(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
            await addJsExtensions(filePath);
        } else if (file.name.endsWith('.js')) {
            let content = await readFile(filePath, 'utf-8');
            content = content.replace(/from ['"](.+?)['"]/g, (match, p1) => {
                if (!p1.startsWith('.') || p1.endsWith('.js')) return match;
                return `from '${p1}.js'`;
            });
            await writeFile(filePath, content);
        }
    }
}
addJsExtensions(distDir).catch(console.error);