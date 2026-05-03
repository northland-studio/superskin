import { ComponentType } from 'react';

declare global {
  namespace JSX {
    interface Element extends ComponentType<any> {}
    interface ElementClass extends ComponentType<any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

export {};
