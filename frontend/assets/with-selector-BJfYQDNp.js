import{r as w}from"./index-BcQW7OjF.js";(function(){try{var e=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{};e.SENTRY_RELEASE={id:"9100b80d8d3578ae8a7e4dcad47fa28b1cb8d4d7"}}catch{}})();try{(function(){var e=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{},t=new e.Error().stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="b612036f-3885-41ed-b3da-ba77259c695e",e._sentryDebugIdIdentifier="sentry-dbid-b612036f-3885-41ed-b3da-ba77259c695e")})()}catch{}var S={exports:{}},h={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var d=w;function D(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var I=typeof Object.is=="function"?Object.is:D,_=d.useState,R=d.useEffect,V=d.useLayoutEffect,j=d.useDebugValue;function T(e,t){var u=t(),a=_({inst:{value:u,getSnapshot:t}}),r=a[0].inst,n=a[1];return V(function(){r.value=u,r.getSnapshot=t,b(r)&&n({inst:r})},[e,u,t]),R(function(){return b(r)&&n({inst:r}),e(function(){b(r)&&n({inst:r})})},[e]),j(u),u}function b(e){var t=e.getSnapshot;e=e.value;try{var u=t();return!I(e,u)}catch{return!0}}function x(e,t){return t()}var O=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?x:T;h.useSyncExternalStore=d.useSyncExternalStore!==void 0?d.useSyncExternalStore:O;S.exports=h;var z=S.exports,g={exports:{}},$={};/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var v=w,L=z;function M(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var k=typeof Object.is=="function"?Object.is:M,G=L.useSyncExternalStore,A=v.useRef,C=v.useEffect,N=v.useMemo,U=v.useDebugValue;$.useSyncExternalStoreWithSelector=function(e,t,u,a,r){var n=A(null);if(n.current===null){var f={hasValue:!1,value:null};n.current=f}else f=n.current;n=N(function(){function y(o){if(!m){if(m=!0,c=o,o=a(o),r!==void 0&&f.hasValue){var i=f.value;if(r(i,o))return l=i}return l=o}if(i=l,k(c,o))return i;var E=a(o);return r!==void 0&&r(i,E)?(c=o,i):(c=o,l=E)}var m=!1,c,l,p=u===void 0?null:u;return[function(){return y(t())},p===null?void 0:function(){return y(p())}]},[t,u,a,r]);var s=G(e,n[0],n[1]);return C(function(){f.hasValue=!0,f.value=s},[s]),U(s),s};g.exports=$;var Y=g.exports;export{z as s,Y as w};
//# sourceMappingURL=with-selector-BJfYQDNp.js.map
