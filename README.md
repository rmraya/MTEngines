# MTEngines

Machine Translation engines library written in TypeScript

Interface `MTEngine` provides these methos, implemented by all supported engines:

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
```

## Supported Engines

- DeepL (Free and Pro)
- Google Cloud Translation
- Microsoft Azure Translator Text
- OpenAI ChatGPT
- Yandex Translate API

## Example

```typescript
import { GoogleTranslator } from "mtengines";

class TestGoogle {

    constructor() {
        let translator: GoogleTranslator = new GoogleTranslator('yourApiKey', true);
        translator.setSourceLanguage("en");
        translator.setTargetLanguage("ja");
         translator.translate("Hello World").then((result:string) => {
            console.log(result);
        }, (error:any) => {
            console.error(error);
        });
    }
}

new TestGoogle();
```
