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


    // Available Models (text completions only)
    static readonly AVAILABLE_MODELS: [string, string][] = [
        ['gpt-4o', 'gpt-4o'],
        ['gpt-4', 'gpt-4'],
        ['gpt-4-turbo', 'gpt-4-turbo'],
        ['gpt-3.5-turbo', 'gpt-3.5-turbo'],
        ['gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k'],
        ['gpt-3.5-turbo-instruct', 'gpt-3.5-turbo-instruct'],
        ['gpt-4-turbo-preview', 'gpt-4-turbo-preview'],
        ['gpt-4o-mini', 'gpt-4o-mini'],
        ['chatgpt-4o-latest', 'chatgpt-4o-latest']
    ]

    // Only keep constants for models in AVAILABLE_MODELS
    static readonly GPT_4o: string = "gpt-4o";
    static readonly GPT_4: string = "gpt-4";
    static readonly GPT_4_TURBO: string = "gpt-4-turbo";
    static readonly GPT_35_TURBO: string = "gpt-3.5-turbo";
    static readonly GPT_35_TURBO_16K: string = "gpt-3.5-turbo-16k";
    static readonly GPT_35_TURBO_INSTRUCT: string = "gpt-3.5-turbo-instruct";
    static readonly GPT_4_TURBO_PREVIEW: string = "gpt-4-turbo-preview";
    static readonly GPT_4O_MINI: string = "gpt-4o-mini";
    static readonly CHATGPT_4O_LATEST: string = "chatgpt-4o-latest";


    openai: OpenAI;
    srcLang: string;
    tgtLang: string;
    model: string = ChatGPTTranslator.GPT_4O_MINI; // Default model

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

    getMTMatch(source: XMLElement, terms: { source: string, target: string }[]): Promise<MTMatch> {
        let propmt: string = MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);
        return new Promise<MTMatch>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { "role": "system", "content": MTUtils.getRole(this.srcLang, this.tgtLang) },
                    { "role": "user", "content": propmt }
                ]
            }).then((completion: any) => {
                let choices: any[] = completion.choices;
                let translation: string = choices[0].message.content.trim();
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (translation.startsWith('```') && translation.endsWith('```')) {
                    translation = translation.substring(3, translation.length - 3).trim();
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
        const models = [
            ChatGPTTranslator.GPT_4o,
            ChatGPTTranslator.GPT_4,
            ChatGPTTranslator.GPT_4_TURBO,
            ChatGPTTranslator.GPT_35_TURBO,
            ChatGPTTranslator.GPT_35_TURBO_16K,
            ChatGPTTranslator.GPT_35_TURBO_INSTRUCT,
            ChatGPTTranslator.GPT_4_TURBO_PREVIEW,
            ChatGPTTranslator.GPT_4O_MINI,
            ChatGPTTranslator.CHATGPT_4O_LATEST
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

    async getAvailableModels(): Promise<string[][]> {
        try {
            const response = await this.openai.models.list();
            return response.data.map((model: any) => [model.id, model.id]);
        } catch (error) {
            console.error('Error fetching available models:', error);
            throw error;
        }
    }
}