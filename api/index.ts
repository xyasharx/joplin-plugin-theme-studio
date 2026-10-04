declare const joplin: any;
export default (typeof joplin !== 'undefined' ? joplin : (global as any).joplin);
