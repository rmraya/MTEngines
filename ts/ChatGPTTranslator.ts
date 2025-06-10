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
import { DOMBuilder, SAXParser, XMLDocument, XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { MTUtils } from "./MTUtils";

export class ChatGPTTranslator implements MTEngine {

    static readonly GPT_41: string = "gpt-4.1";
    static readonly GPT_41_MINI: string = "gpt-4.1-mini";
    static readonly GPT_41_NANO: string = "gpt-4.1-nano";
    static readonly GPT_4o: string = "gpt-4o";
    static readonly GPT_4o_MINI: string = "gpt-4o-mini";
    static readonly GPT_4: string = "gpt-4";
    static readonly GPT_4_TURBO: string = "gpt-4-turbo";
    static readonly GPT_35_TURBO: string = "gpt-3.5-turbo";
    static readonly GPT_o3: string = "o3-mini";
    static readonly GPT_o1: string = "o1";
    static readonly GPT_o1_MINI: string = "o1-mini";
    static readonly GPT_o1_PRO: string = "o1-pro";
    static readonly GPT_o4_MINI: string = "o4-mini";


    openai: OpenAI;
    srcLang: string;
    tgtLang: string;
    model: string = ChatGPTTranslator.GPT_4o_MINI; // Default model

    constructor(apiKey: string, model?: string) {
        this.openai = new OpenAI({ apiKey: apiKey });
        if (model) {
            this.model = model;
        }
    }

    getName(): string {
        return 'ChatGPT API';
    }

    getShortName(): string {
        return 'ChatGPT';
    }

    getSourceLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
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
        let propmt: string = MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);
        return new Promise<string>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
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
        let propmt: string = MTUtils.generatePrompt(source, this.srcLang, this.tgtLang);
        return new Promise<MTMatch>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
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
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target>') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }
                let target: XMLElement = MTUtils.toXMLElement(translation);
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return true;
    }

    getModels(): string[] {
        let models: string[] = [
            ChatGPTTranslator.GPT_41,
            ChatGPTTranslator.GPT_41_MINI,
            ChatGPTTranslator.GPT_41_NANO,
            ChatGPTTranslator.GPT_4o,
            ChatGPTTranslator.GPT_4o_MINI,
            ChatGPTTranslator.GPT_4,
            ChatGPTTranslator.GPT_4_TURBO,
            ChatGPTTranslator.GPT_35_TURBO,
            ChatGPTTranslator.GPT_o3,
            ChatGPTTranslator.GPT_o1,
            ChatGPTTranslator.GPT_o1_MINI,
            ChatGPTTranslator.GPT_o1_PRO,
            ChatGPTTranslator.GPT_o4_MINI
        ];
        models.sort((a: string, b: string) => {
            return a.localeCompare(b, 'en');
        });
        return models;
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
        let propmt: string = MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);
        return new Promise<string>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
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
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
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

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        let propmt: string = MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);
        return new Promise<XMLElement>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
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
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target>') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }

                let contentHandler: DOMBuilder = new DOMBuilder();
                let xmlParser = new SAXParser();
                xmlParser.setContentHandler(contentHandler);
                xmlParser.parseString(translation);
                let newDoc: XMLDocument = contentHandler.getDocument();
                resolve(newDoc.getRoot());
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }
}
