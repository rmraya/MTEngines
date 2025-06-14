# MTEngines

TypeScript library for Machine Translation (MT) using various engines. It provides a unified interface to interact with different MT and AI services, allowing you to translate text between multiple languages.

Interface `MTEngine` provides these methods:

```typescript
    getName(): string;
    getShortName(): string;
    getSourceLanguages(): Promise<string[]>;
    getTargetLanguages(): Promise<string[]>;
    setSourceLanguage(lang: string): void;
    getSourceLanguage(): string;
    setTargetLanguage(lang: string): void;
    getTargetLanguage(): string;
    translate(source: string): Promise<string>;
    getMTMatch(source: string): Promise<MTMatch>;
    handlesTags(): boolean;
    fixesMatches(): boolean;
    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch>;
    fixesTags(): boolean;
    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement>;
```

All supported engines implement the `MTEngine` interface. Methods `fixMatch()` and `fixTags()` are only implemented by AI-based engines (`ChatGPTTranslator` and `AnthropicTranslator`), all other engines throw an error when they are called.

## Supported Engines

- Anthropic Claude
- DeepL (Free and Pro)
- Google Cloud Translation
- Microsoft Azure Translator Text
- ModernMT
- OpenAI ChatGPT
- Yandex Translate API

## Installation

```bash
npm install mtengines
```

## Example

```typescript
import { GoogleTranslator } from "mtengines";

class TestGoogle {

    constructor() {
        let translator: GoogleTranslator = new GoogleTranslator('yourApiKey');
        translator.setSourceLanguage("en");
        translator.setTargetLanguage("ja");
         translator.translate("Hello World").then((result: string) => {
            console.log(result);
        }, (error: any) => {
            console.error(error);
        });
    }
}

new TestGoogle();
```
