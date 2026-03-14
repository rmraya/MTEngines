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

import { DOMBuilder, SAXParser, XMLAttribute, XMLDocument, XMLElement } from 'typesxml';
import { MTEngine } from './MTEngine.js';
import { MTMatch } from './MTMatch.js';
import { MTUtils } from './MTUtils.js';

export class GeminiTranslator implements MTEngine {

    apiKey: string;
    model: string | undefined;
    srcLang: string = '';
    tgtLang: string = '';

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        } else {
            this.model = 'gemini-2.5-flash';
        }
    }

    setModel(model: string): void {
        this.model = model;
    }

    getName(): string {
        return 'Google Gemini';
    }

    getShortName(): string {
        return 'Gemini';
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
        let systemInstruction = MTUtils.getRole(this.srcLang, this.tgtLang);
        let prompt: string = MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);

        return new Promise<string>((resolve, reject) => {
            fetch('https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent?key=' + this.apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    }
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            }).then((data: any) => {
                if (data.candidates && data.candidates.length > 0) {
                    let translation: string = data.candidates[0].content.parts[0].text.trim();
                    if (translation.startsWith('\n\n')) {
                        translation = translation.substring(2);
                    }
                    while (translation.startsWith('"') && translation.endsWith('"')) {
                        translation = translation.substring(1, translation.length - 1);
                    }
                    if (translation.startsWith('"""') && translation.endsWith('"""')) {
                        translation = translation.substring(3, translation.length - 3).trim();
                    }
                    if (source.startsWith('"') && source.endsWith('"')) {
                        translation = '"' + translation + '"';
                    }
                    resolve(translation);
                } else {
                    reject(new Error('No translation returned from Gemini API'));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement, terms: { source: string; target: string; }[]): Promise<MTMatch> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let systemInstruction = MTUtils.getRole(this.srcLang, this.tgtLang);
        let prompt: string = MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);

        return new Promise<MTMatch>((resolve, reject) => {
            fetch('https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent?key=' + this.apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    }
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            }).then((data: any) => {
                if (data.candidates && data.candidates.length > 0) {
                    let translation: string = data.candidates[0].content.parts[0].text.trim();
                    if (translation.startsWith('```xml') && translation.endsWith('```')) {
                        translation = translation.substring(6, translation.length - 3).trim();
                    }
                    if (translation.startsWith('```') && translation.endsWith('```')) {
                        translation = translation.substring(3, translation.length - 3).trim();
                    }
                    if (!translation.trim().startsWith('<target') && !translation.trim().endsWith('</target>')) {
                        translation = '<target>' + translation + '</target>';
                    }
                    let target: XMLElement = MTUtils.toXMLElement(translation);
                    let space: XMLAttribute | undefined = source.getAttribute('xml:space');
                    if (space) {
                        target.setAttribute(space);
                    }
                    resolve(new MTMatch(source, target, this.getShortName()));
                } else {
                    reject(new Error('No translation returned from Gemini API'));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return true;
    }

    fixesMatches(): boolean {
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
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
        let systemInstruction = MTUtils.getRole(this.srcLang, this.tgtLang);
        let prompt: string = MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);

        return new Promise<string>((resolve, reject) => {
            fetch('https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent?key=' + this.apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    }
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            }).then((data: any) => {
                if (data.candidates && data.candidates.length > 0) {
                    let translation: string = data.candidates[0].content.parts[0].text.trim();
                    if (translation.startsWith('\n\n')) {
                        translation = translation.substring(2);
                    }
                    while (translation.startsWith('"') && translation.endsWith('"')) {
                        translation = translation.substring(1, translation.length - 1);
                    }
                    if (translation.startsWith('```xml') && translation.endsWith('```')) {
                        translation = translation.substring(6, translation.length - 3).trim();
                    }
                    if (!translation.trim().startsWith('<target') && !translation.trim().endsWith('</target>')) {
                        translation = '<target>' + translation + '</target>';
                    }
                    resolve(translation);
                } else {
                    reject(new Error('No translation returned from Gemini API'));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
        let systemInstruction = MTUtils.getRole(this.srcLang, this.tgtLang);
        let prompt: string = MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);

        return new Promise<XMLElement>((resolve, reject) => {
            fetch('https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent?key=' + this.apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    }
                }),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            }).then((data: any) => {
                if (data.candidates && data.candidates.length > 0) {
                    let translation: string = data.candidates[0].content.parts[0].text.trim();
                    if (translation.startsWith('\n\n')) {
                        translation = translation.substring(2);
                    }
                    while (translation.startsWith('"') && translation.endsWith('"')) {
                        translation = translation.substring(1, translation.length - 1);
                    }
                    if (translation.startsWith('```xml') && translation.endsWith('```')) {
                        translation = translation.substring(6, translation.length - 3).trim();
                    }
                    if (!translation.trim().startsWith('<target') && !translation.trim().endsWith('</target>')) {
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
                } else {
                    reject(new Error('No translation returned from Gemini API'));
                }
            }).catch((error: Error) => {
                reject(error);
            });
        });
    }

    async getAvailableModels(): Promise<string[][]> {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + this.apiKey, {
                method: 'GET',
            });
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            const data: any = await response.json();
            if (data.models) {
                // Filter for models that support generateContent
                return data.models
                    .filter((model: any) => 
                        model.supportedGenerationMethods && 
                        model.supportedGenerationMethods.includes('generateContent')
                    )
                    .map((model: any) => [
                        model.name.replace('models/', ''), 
                        model.displayName || model.name.replace('models/', '')
                    ]);
            }
            return [];
        } catch (error) {
            console.error('Error fetching available models:', error);
            throw error;
        }
    }
}
