/*******************************************************************************
 * Copyright (c) 2023 - 2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse   License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { OpenAI } from "openai";
import { Language, LanguageUtils } from "typesbcp47";
import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { MTUtils } from "./MTUtils";

export class ChatGPTTranslator implements MTEngine {

    static readonly GPT_4o: string = "gpt-4o";
    static readonly GPT_4o_MINI: string = "gpt-4o-mini";
    static readonly GPT_4: string = "gpt-4";
    static readonly GPT_4_TURBO: string = "gpt-4-turbo";
    static readonly GPT_35_TURBO: string = "gpt-3.5-turbo";

    openai: OpenAI;
    srcLang: string;
    tgtLang: string;
    apiKey: string;
    model: string;

    constructor(apiKey: string, model?: string) {
        this.openai = new OpenAI({ apiKey: apiKey });
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        } else {
            this.model = ChatGPTTranslator.GPT_35_TURBO;
        }
    }

    getName(): string {
        return 'ChatGPT API';
    }

    getShortName(): string {
        return 'ChatGPT';
    }

    getRole(): string {
        let srcLanguage: string = LanguageUtils.getLanguage(this.srcLang, 'en').description;
        let tgetLanguage: string = LanguageUtils.getLanguage(this.tgtLang, 'en').description;
        return 'You are an expert translator from ' + srcLanguage + ' to ' + tgetLanguage + '.';
    }
    
    getLanguages(): Promise<string[]> {
        // ChatGPT should support any language, but we'll limit it to 
        // the common ones supported by the TypesBCP47 library
        return new Promise<string[]>((resolve, reject) => {
            try {
                let languages: Language[] = LanguageUtils.getCommonLanguages('en');
                let result: string[] = [];
                for (let language of languages) {
                    result.push(language.code);
                }
                resolve(result);
            } catch (error) {
                if (error instanceof Error) {
                    reject(error);
                    return;
                }
                reject(error as Error);
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
        return new Promise<string>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": this.getRole()},
                    { "role": "user", "content": propmt }
                ]
            }).then((completion: any) => {
                let choices: any[] = completion.choices;
                let translation: string = choices[0].message.content;
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
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement): Promise<MTMatch> {
        return new Promise<MTMatch>((resolve, reject) => {
            this.translate(MTUtils.plainText(source)).then((translation: string) => {
                let target: XMLElement = new XMLElement('target');
                target.addString(translation);
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return false;
    }

    getModels(): string[] {
        return [ChatGPTTranslator.GPT_4o, ChatGPTTranslator.GPT_4o_MINI, ChatGPTTranslator.GPT_4, ChatGPTTranslator.GPT_4_TURBO, ChatGPTTranslator.GPT_35_TURBO];
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        return new Promise<MTMatch>((resolve, reject) => {
            this.fixTranslation(originalSource, matchSource, matchTarget).then((translation: string) => {
                let target: XMLElement = MTUtils.toXMLElement(translation);
                resolve(new MTMatch(originalSource, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    fixTranslation(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<string> {
        let propmt: string = `The following "Target XML" is the translation of "Source XML".

Target XML: ` + matchTarget.toString() + `
Source XML: ` + matchSource.toString() + `

The following "New XML" is similar to "Source XML".

New XML: ` + originalSource.toString() + `

Translate the content of "New XML" so that the translation is phrased similarly to the content of "Target XML" but is an accurate translation of "New XML".

Provide only the requested translation in the same XML format as "Target XML" and do not add any additional text. Make sure the translation is valid XML and does not contain any XML errors.`;
       
        return new Promise<string>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": this.getRole() },
                    { "role": "user", "content": propmt }
                ]
            }).then((completion: any) => {
                let choices: any[] = completion.choices;
                let translation: string = choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if  (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target>') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }
                resolve(translation);
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }
    
    fixesMatches(): boolean {
        return true;
    }
}