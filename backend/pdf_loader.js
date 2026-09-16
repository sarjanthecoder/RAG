/**
 * PDF Loader Module - With Text Cleanup (Node.js)
 * Ported 1:1 from pdf_loader.py
 * Handles loading PDF documents and cleaning up extracted text
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Clean up text that has spaces between every character.
 * This is common in some PDF extraction scenarios.
 * Exactly matches Python clean_spaced_text() logic.
 *
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
function clean_spaced_text(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Pattern to detect text like "S E P / 1 5 / 2 0 2 5"
    // Look for sequences where single characters are separated by single spaces
    const lines = text.split('\n');
    const cleaned_lines = [];

    for (const line of lines) {
        // Check if line has the pattern of space-separated characters
        // (more than 30% single-char tokens separated by spaces)
        const tokens = line.split(' ');
        if (tokens.length > 5) {
            let single_char_count = 0;
            for (const t of tokens) {
                if (t.length === 1) {
                    single_char_count++;
                }
            }

            if (single_char_count / tokens.length > 0.5) {
                // This line likely has spaced-out text, join it
                const cleaned_line = tokens.join('');
                cleaned_lines.push(cleaned_line);
            } else {
                cleaned_lines.push(line);
            }
        } else {
            cleaned_lines.push(line);
        }
    }

    return cleaned_lines.join('\n');
}

/**
 * Helper to unescape PDF string literals
 */
function unescapePdfString(str) {
    return str
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
}

/**
 * Built-in native PDF text extractor (zero external npm dependencies required).
 * Extracts text from decompressed FlateDecode / uncompressed streams.
 *
 * @param {Buffer} buffer - PDF file buffer
 * @returns {string} - Extracted text
 */
function extractTextNative(buffer) {
    const content = buffer.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    let extractedText = '';

    while ((match = streamRegex.exec(content)) !== null) {
        const streamData = Buffer.from(match[1], 'binary');
        let decompressed;

        try {
            decompressed = zlib.inflateSync(streamData);
        } catch (_) {
            try {
                decompressed = zlib.inflateRawSync(streamData);
            } catch (__) {
                decompressed = streamData;
            }
        }

        const streamText = decompressed.toString('latin1');
        const textBlockRegex = /BT[\s\S]*?ET/g;
        let blockMatch;

        while ((blockMatch = textBlockRegex.exec(streamText)) !== null) {
            const block = blockMatch[0];

            // 1) Match TJ array operator: [ (...) -250 (...) ] TJ
            const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
            let arrayMatch;
            while ((arrayMatch = tjArrayRegex.exec(block)) !== null) {
                const arrayContent = arrayMatch[1];
                // Tokens are either (string literal) or numeric displacement
                const tokenRegex = /\(([^)]*)\)|(-?\d+(?:\.\d+)?)/g;
                let tokenMatch;
                let linePart = '';

                while ((tokenMatch = tokenRegex.exec(arrayContent)) !== null) {
                    if (tokenMatch[1] !== undefined) {
                        linePart += unescapePdfString(tokenMatch[1]);
                    } else if (tokenMatch[2] !== undefined) {
                        const num = parseFloat(tokenMatch[2]);
                        // Negative displacement of >= 120 in PDF 1/1000 em units represents word spacing
                        if (num <= -120) {
                            linePart += ' ';
                        }
                    }
                }

                if (linePart) {
                    extractedText += linePart + ' ';
                }
            }

            // 2) Match single string operator: (...) Tj
            const tjSingleRegex = /\(([^)]*)\)\s*Tj/g;
            let singleMatch;
            while ((singleMatch = tjSingleRegex.exec(block)) !== null) {
                const str = unescapePdfString(singleMatch[1]);
                if (str) {
                    extractedText += str + ' ';
                }
            }

            extractedText += '\n';
        }
    }

    return extractedText;
}

/**
 * Load a PDF file and extract all text content.
 * Exactly matches Python load_pdf(file_path) functionality.
 *
 * @param {string} file_path - Path to the PDF file
 * @returns {Promise<string>} - Extracted and cleaned text content
 */
async function load_pdf(file_path) {
    if (!fs.existsSync(file_path)) {
        throw new Error(`PDF file not found: ${file_path}`);
    }

    let rawText = '';

    // If pdf-parse library is installed in the project, use it
    try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(file_path);
        const data = await pdfParse(dataBuffer);
        rawText = data.text || '';
    } catch (_) {
        // Fallback to built-in zero-dependency native PDF extractor
        const buffer = fs.readFileSync(file_path);
        rawText = extractTextNative(buffer);
    }

    // Clean up the extracted text exactly like Python: clean_spaced_text(text.strip())
    const cleaned_text = clean_spaced_text(rawText.trim());

    return cleaned_text;
}

/**
 * Synchronous version of load_pdf for synchronous workflows
 *
 * @param {string} file_path - Path to the PDF file
 * @returns {string} - Extracted and cleaned text content
 */
function load_pdf_sync(file_path) {
    if (!fs.existsSync(file_path)) {
        throw new Error(`PDF file not found: ${file_path}`);
    }

    const buffer = fs.readFileSync(file_path);
    const rawText = extractTextNative(buffer);
    return clean_spaced_text(rawText.trim());
}

// Export both snake_case (exact Python names) and camelCase (idiomatic JavaScript names)
module.exports = {
    clean_spaced_text,
    cleanSpacedText: clean_spaced_text,
    load_pdf,
    loadPdf: load_pdf,
    load_pdf_sync,
    loadPdfSync: load_pdf_sync,
};

// If run directly via `node pdf_loader.js <path-to-pdf>`
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: node pdf_loader.js <path-to-pdf>");
        // Run self-test on clean_spaced_text
        const sampleSpaced = "S E P / 1 5 / 2 0 2 5\nNormal Text Line\nA B C D E F G";
        console.log("\n--- Self-Test: clean_spaced_text ---");
        console.log("Input:\n" + sampleSpaced);
        console.log("Output:\n" + clean_spaced_text(sampleSpaced));
        process.exit(0);
    }

    const targetFile = args[0];
    console.log(`Loading PDF from: ${targetFile}`);
    load_pdf(targetFile)
        .then((text) => {
            console.log(`Successfully extracted ${text.length} characters.`);
            console.log("\n--- Preview (First 500 characters) ---");
            console.log(text.slice(0, 500));
        })
        .catch((err) => {
            console.error("Error loading PDF:", err.message);
            process.exit(1);
        });
}
