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

import { MTEngine } from "./MTEngine";

export class ChatGPTTranslator implements MTEngine {

    static readonly DAVINCI: string = "text-davinci-003";
    static readonly CURIE: string = "text-curie-001";
    static readonly BABBAGE: string = "text-babbage-001";
    static readonly ADA: string = "text-ada-001";

    srcLang: string;
    tgtLang: string;
    apiKey: string;
    model: string;

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    getName(): string {
        return 'ChatGPT API';
    }

    getShortName(): string {
        return 'ChatGPT';
    }

    getSourceLanguages(): Promise<string[]> {
        throw new Error("Method not implemented.");
    }

    getTargetLanguages(): Promise<string[]> {
        throw new Error("Method not implemented.");
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
                        let translation: string = array[0].text;
                        if (translation.startsWith('\n\n')) {
                            translation = translation.substring(2);
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