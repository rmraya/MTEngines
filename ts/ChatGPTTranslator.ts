/*******************************************************************************
 * Copyright (c) 2023-2026 Maxprograms.
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
import { MTEngine } from "./MTEngine.js";
import { MTMatch } from "./MTMatch.js";
import { MTUtils } from "./MTUtils.js";

export class ChatGPTTranslator implements MTEngine {


    openai: OpenAI;
    srcLang: string = '';
    tgtLang: string = '';
    model: string | undefined;

    constructor(apiKey: string, model?: string) {
        this.openai = new OpenAI({ apiKey: apiKey });
        if (model) {
            this.model = model;
        }
    }

    getName(): string {
        return 'ChatGPT API';
    }

    setModel(model: string): void {
        this.model = model;
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
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
        let propmt: string = MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);
        return new Promise<string>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model!,
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
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let propmt: string = MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);
        return new Promise<MTMatch>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model!,
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
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let propmt: string = MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);
        return new Promise<string>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model!,
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
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let propmt: string = MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);
        return new Promise<XMLElement>((resolve, reject) => {
            this.openai.chat.completions.create({
                model: this.model!,
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
                let newDoc: XMLDocument | undefined = contentHandler.getDocument();
                if (newDoc) {
                    const targetElement = newDoc.getRoot();
                    if (targetElement) {
                        resolve(targetElement);
                    } else {
                        reject(new Error('No root element found in fixTags response'));
                    }
                } else {
                    reject(new Error('Error parsing XML from fixTags response'));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    async getAvailableModels(): Promise<string[][]> {
        try {
            const response = await this.openai.models.list();
            return response.data.map((model: any) => [model.id, model.id]);
        } catch (error: unknown) {
            console.error('Error fetching available models:', error);
            throw error;
        }
    }
}