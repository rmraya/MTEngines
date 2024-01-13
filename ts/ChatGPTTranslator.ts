/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse   License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { Language, LanguageUtils } from "typesbcp47";
import { MTEngine } from "./MTEngine";

export class ChatGPTTranslator implements MTEngine {

    static readonly TURBO_INSTRUCT: string = "gpt-3.5-turbo-instruct";

    srcLang: string;
    tgtLang: string;
    apiKey: string;
    model: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        } else {
            this.model = ChatGPTTranslator.TURBO_INSTRUCT;
        }
    }

    getName(): string {
        return 'ChatGPT API';
    }

    getShortName(): string {
        return 'ChatGPT';
    }

    getLanguages(): Promise<string[]> {
        // ChatGPT should support any language, but we'll limit it to 
        // the common ones supported by the TypesBCP47 library
        return new Promise<string[]>((resolve, reject) => {
            try {
                let languages: Language[] = LanguageUtils.getCommonLanguages();
                let result: string[] = [];
                for (let language of languages) {
                    result.push(language.code);
                }
                resolve(result);
            } catch (error: any) {
                reject(error);
            }
        });
    }

    getSourceLanguages(): Promise<string[]> {
        return this.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return this.getLanguages();
    }

    setSourceLanguage(lang: string): void {
        this.srcLang = lang;
    }

    getSourceLanguage(): string {
        return this.srcLang;
    }

    setTargetLanguage(lang: string): void {
        this.tgtLang = lang;
    }

    getTargetLanguage(): string {
        return this.tgtLang;
    }

    translate(source: string): Promise<string> {
        let propmt: string = 'Translate the text enclosed on triple quotes from "' + this.srcLang + '" to "' + this.tgtLang + '": """' + source + '"""';
        let params: any = {
            "model": this.model,
            "prompt": propmt,
            "max_tokens": 300,
            "temperature": 0.7,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0
        };
        let data: string = JSON.stringify(params);

        return new Promise<string>((resolve, reject) => {
            fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                headers: [
                    ['Authorization', 'Bearer ' + this.apiKey],
                    ['Content-Type', 'application/json'],
                    ['Accept', 'application/json'],
                    ['Content-Length', '' + data.length]
                ],
                body: data
            }).then((response: Response) => {
                if (response.ok) {
                    response.json().then((json: any) => {
                        let array: any[] = json.choices;
                        let translation: string = array[0].text.trim();
                        if (translation.startsWith('\n\n')) {
                            translation = translation.substring(2);
                        }
                        while (translation.startsWith('"') && translation.endsWith('"')) {
                            translation = translation.substring(1, translation.length - 1);
                        }
                        if (source.startsWith('"') && source.endsWith('"')) {
                            translation = '"' + translation + '"';
                        }
                        resolve(translation);
                    }).catch((error: any) => {
                        reject(error);
                    });
                } else {
                    reject(response.statusText);
                }
            }).catch((error: any) => {
                reject(error);
            });
        });
    }
}