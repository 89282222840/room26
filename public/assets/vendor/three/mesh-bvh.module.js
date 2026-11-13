import{BufferAttribute as Se,Vector3 as D,Vector2 as ht,Plane as De,Line3 as Z,Triangle as dt,Sphere as Ue,Matrix4 as st,Box3 as j,REVISION as Fe,BackSide as Le,DoubleSide as ke,FrontSide as xe,Object3D as jn,Mesh as Ve,BufferGeometry as Yn,Group as Zn,LineBasicMaterial as Kn,MeshBasicMaterial as Jn,Ray as Qn,BatchedMesh as qe,RGBAFormat as Gn,RGFormat as ti,RedFormat as ei,RGBAIntegerFormat as ni,RGIntegerFormat as ii,RedIntegerFormat as si,DataTexture as oi,NearestFilter as ri,IntType as ci,UnsignedIntType as ai,FloatType as li,UnsignedByteType as ui,UnsignedShortType as fi,ByteType as di,ShortType as pi,Vector4 as hi,Matrix3 as mi}from"./three.module.js";var me=0,He=1,We=2;var be=2,jt=1.25,ge=1,Mt=32,Ot=65535,Xe=Math.pow(2,-24),Yt=Symbol("SKIP_GENERATION");function Oe(n){return n.index?n.index.count:n.attributes.position.count}function mt(n){return Oe(n)/3}function $e(n,e=ArrayBuffer){return n>65535?new Uint32Array(new e(4*n)):new Uint16Array(new e(2*n))}function je(n,e){if(!n.index){let t=n.attributes.position.count,i=e.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,o=$e(t,i);n.setIndex(new Se(o,1));for(let a=0;a<t;a++)o[a]=a}}function Ce(n,e){let t=mt(n),i=e||n.drawRange,o=i.start/3,a=(i.start+i.count)/3,s=Math.max(0,o),c=Math.min(t,a)-s;return[{offset:Math.floor(s),count:Math.floor(c)}]}function ze(n,e){if(!n.groups||!n.groups.length)return Ce(n,e);let t=[],i=new Set,o=e||n.drawRange,a=o.start/3,s=(o.start+o.count)/3;for(let r of n.groups){let d=r.start/3,u=(r.start+r.count)/3;i.add(Math.max(a,d)),i.add(Math.min(s,u))}let c=Array.from(i.values()).sort((r,d)=>r-d);for(let r=0;r<c.length-1;r++){let d=c[r],u=c[r+1];t.push({offset:Math.floor(d),count:Math.floor(u-d)})}return t}function Ye(n,e){let t=mt(n),i=ze(n,e).sort((s,c)=>s.offset-c.offset),o=i[i.length-1];o.count=Math.min(t-o.offset,o.count);let a=0;return i.forEach(({count:s})=>a+=s),t!==a}function Zt(n,e,t,i,o){let a=1/0,s=1/0,c=1/0,r=-1/0,d=-1/0,u=-1/0,f=1/0,l=1/0,p=1/0,w=-1/0,v=-1/0,y=-1/0;for(let m=e*6,h=(e+t)*6;m<h;m+=6){let x=n[m+0],g=n[m+1],b=x-g,T=x+g;b<a&&(a=b),T>r&&(r=T),x<f&&(f=x),x>w&&(w=x);let A=n[m+2],_=n[m+3],B=A-_,P=A+_;B<s&&(s=B),P>d&&(d=P),A<l&&(l=A),A>v&&(v=A);let I=n[m+4],M=n[m+5],S=I-M,F=I+M;S<c&&(c=S),F>u&&(u=F),I<p&&(p=I),I>y&&(y=I)}i[0]=a,i[1]=s,i[2]=c,i[3]=r,i[4]=d,i[5]=u,o[0]=f,o[1]=l,o[2]=p,o[3]=w,o[4]=v,o[5]=y}function Ze(n,e=null,t=null,i=null){let o=n.attributes.position,a=n.index?n.index.array:null,s=mt(n),c=o.normalized,r;e===null?(r=new Float32Array(s*6),t=0,i=s):(r=e,t=t||0,i=i||s);let d=o.array,u=o.offset||0,f=3;o.isInterleavedBufferAttribute&&(f=o.data.stride);let l=["getX","getY","getZ"];for(let p=t;p<t+i;p++){let w=p*3,v=p*6,y=w+0,m=w+1,h=w+2;a&&(y=a[y],m=a[m],h=a[h]),c||(y=y*f+u,m=m*f+u,h=h*f+u);for(let x=0;x<3;x++){let g,b,T;c?(g=o[l[x]](y),b=o[l[x]](m),T=o[l[x]](h)):(g=d[y+x],b=d[m+x],T=d[h+x]);let A=g;b<A&&(A=b),T<A&&(A=T);let _=g;b>_&&(_=b),T>_&&(_=T);let B=(_-A)/2,P=x*2;r[v+P+0]=A+B,r[v+P+1]=B+(Math.abs(A)+B)*Xe}}return r}function E(n,e,t){return t.min.x=e[n],t.min.y=e[n+1],t.min.z=e[n+2],t.max.x=e[n+3],t.max.y=e[n+4],t.max.z=e[n+5],t}function we(n){let e=-1,t=-1/0;for(let i=0;i<3;i++){let o=n[i+3]-n[i];o>t&&(t=o,e=i)}return e}function ve(n,e){e.set(n)}function Ae(n,e,t){let i,o;for(let a=0;a<3;a++){let s=a+3;i=n[a],o=e[a],t[a]=i<o?i:o,i=n[s],o=e[s],t[s]=i>o?i:o}}function Dt(n,e,t){for(let i=0;i<3;i++){let o=e[n+2*i],a=e[n+2*i+1],s=o-a,c=o+a;s<t[i]&&(t[i]=s),c>t[i+3]&&(t[i+3]=c)}}function bt(n){let e=n[3]-n[0],t=n[4]-n[1],i=n[5]-n[2];return 2*(e*t+t*i+i*e)}var Y=32,Ke=(n,e)=>n.candidate-e.candidate,J=new Array(Y).fill().map(()=>({count:0,bounds:new Float32Array(6),rightCacheBounds:new Float32Array(6),leftCacheBounds:new Float32Array(6),candidate:0})),Ft=new Float32Array(6);function Je(n,e,t,i,o,a){let s=-1,c=0;if(a===me)s=we(e),s!==-1&&(c=(e[s]+e[s+3])/2);else if(a===He)s=we(n),s!==-1&&(c=Qe(t,i,o,s));else if(a===We){let r=bt(n),d=jt*o,u=i*6,f=(i+o)*6;for(let l=0;l<3;l++){let p=e[l],y=(e[l+3]-p)/Y;if(o<Y/4){let m=[...J];m.length=o;let h=0;for(let g=u;g<f;g+=6,h++){let b=m[h];b.candidate=t[g+2*l],b.count=0;let{bounds:T,leftCacheBounds:A,rightCacheBounds:_}=b;for(let B=0;B<3;B++)_[B]=1/0,_[B+3]=-1/0,A[B]=1/0,A[B+3]=-1/0,T[B]=1/0,T[B+3]=-1/0;Dt(g,t,T)}m.sort(Ke);let x=o;for(let g=0;g<x;g++){let b=m[g];for(;g+1<x&&m[g+1].candidate===b.candidate;)m.splice(g+1,1),x--}for(let g=u;g<f;g+=6){let b=t[g+2*l];for(let T=0;T<x;T++){let A=m[T];b>=A.candidate?Dt(g,t,A.rightCacheBounds):(Dt(g,t,A.leftCacheBounds),A.count++)}}for(let g=0;g<x;g++){let b=m[g],T=b.count,A=o-b.count,_=b.leftCacheBounds,B=b.rightCacheBounds,P=0;T!==0&&(P=bt(_)/r);let I=0;A!==0&&(I=bt(B)/r);let M=ge+jt*(P*T+I*A);M<d&&(s=l,d=M,c=b.candidate)}}else{for(let x=0;x<Y;x++){let g=J[x];g.count=0,g.candidate=p+y+x*y;let b=g.bounds;for(let T=0;T<3;T++)b[T]=1/0,b[T+3]=-1/0}for(let x=u;x<f;x+=6){let T=~~((t[x+2*l]-p)/y);T>=Y&&(T=Y-1);let A=J[T];A.count++,Dt(x,t,A.bounds)}let m=J[Y-1];ve(m.bounds,m.rightCacheBounds);for(let x=Y-2;x>=0;x--){let g=J[x],b=J[x+1];Ae(g.bounds,b.rightCacheBounds,g.rightCacheBounds)}let h=0;for(let x=0;x<Y-1;x++){let g=J[x],b=g.count,T=g.bounds,_=J[x+1].rightCacheBounds;b!==0&&(h===0?ve(T,Ft):Ae(T,Ft,Ft)),h+=b;let B=0,P=0;h!==0&&(B=bt(Ft)/r);let I=o-h;I!==0&&(P=bt(_)/r);let M=ge+jt*(B*h+P*I);M<d&&(s=l,d=M,c=g.candidate)}}}}else console.warn(`MeshBVH: Invalid build strategy value ${a} used.`);return{axis:s,pos:c}}function Qe(n,e,t,i){let o=0;for(let a=e,s=e+t;a<s;a++)o+=n[a*6+i*2];return o/t}var Pt=class{constructor(){this.boundingData=new Float32Array(6)}};function Ge(n,e,t,i,o,a){let s=i,c=i+o-1,r=a.pos,d=a.axis*2;for(;;){for(;s<=c&&t[s*6+d]<r;)s++;for(;s<=c&&t[c*6+d]>=r;)c--;if(s<c){for(let u=0;u<3;u++){let f=e[s*3+u];e[s*3+u]=e[c*3+u],e[c*3+u]=f}for(let u=0;u<6;u++){let f=t[s*6+u];t[s*6+u]=t[c*6+u],t[c*6+u]=f}s++,c--}else return s}}function tn(n,e,t,i,o,a){let s=i,c=i+o-1,r=a.pos,d=a.axis*2;for(;;){for(;s<=c&&t[s*6+d]<r;)s++;for(;s<=c&&t[c*6+d]>=r;)c--;if(s<c){let u=n[s];n[s]=n[c],n[c]=u;for(let f=0;f<6;f++){let l=t[s*6+f];t[s*6+f]=t[c*6+f],t[c*6+f]=l}s++,c--}else return s}}function L(n,e){return e[n+15]===65535}function k(n,e){return e[n+6]}function q(n,e){return e[n+14]}function H(n){return n+8}function W(n,e){return e[n+6]}function Ee(n,e){return e[n+7]}var Ne,_t,Wt,Re,en=Math.pow(2,32);function ie(n){return"count"in n?1:1+ie(n.left)+ie(n.right)}function nn(n,e,t){return Ne=new Float32Array(t),_t=new Uint32Array(t),Wt=new Uint16Array(t),Re=new Uint8Array(t),se(n,e)}function se(n,e){let t=n/4,i=n/2,o="count"in e,a=e.boundingData;for(let s=0;s<6;s++)Ne[t+s]=a[s];if(o)if(e.buffer){let s=e.buffer;Re.set(new Uint8Array(s),n);for(let c=n,r=n+s.byteLength;c<r;c+=Mt){let d=c/2;L(d,Wt)||(_t[c/4+6]+=t)}return n+s.byteLength}else{let s=e.offset,c=e.count;return _t[t+6]=s,Wt[i+14]=c,Wt[i+15]=Ot,n+Mt}else{let s=e.left,c=e.right,r=e.splitAxis,d;if(d=se(n+Mt,s),d/4>en)throw new Error("MeshBVH: Cannot store child pointer greater than 32 bits.");return _t[t+6]=d/4,d=se(d,c),_t[t+7]=r,d}}function sn(n,e){let t=(n.index?n.index.count:n.attributes.position.count)/3,i=t>2**16,o=i?4:2,a=e?new SharedArrayBuffer(t*o):new ArrayBuffer(t*o),s=i?new Uint32Array(a):new Uint16Array(a);for(let c=0,r=s.length;c<r;c++)s[c]=c;return s}function on(n,e,t,i,o){let{maxDepth:a,verbose:s,maxLeafTris:c,strategy:r,onProgress:d,indirect:u}=o,f=n._indirectBuffer,l=n.geometry,p=l.index?l.index.array:null,w=u?tn:Ge,v=mt(l),y=new Float32Array(6),m=!1,h=new Pt;return Zt(e,t,i,h.boundingData,y),g(h,t,i,y),h;function x(b){d&&d(b/v)}function g(b,T,A,_=null,B=0){if(!m&&B>=a&&(m=!0,s&&(console.warn(`MeshBVH: Max depth of ${a} reached when generating BVH. Consider increasing maxDepth.`),console.warn(l))),A<=c||B>=a)return x(T+A),b.offset=T,b.count=A,b;let P=Je(b.boundingData,_,e,T,A,r);if(P.axis===-1)return x(T+A),b.offset=T,b.count=A,b;let I=w(f,p,e,T,A,P);if(I===T||I===T+A)x(T+A),b.offset=T,b.count=A;else{b.splitAxis=P.axis;let M=new Pt,S=T,F=I-T;b.left=M,Zt(e,S,F,M.boundingData,y),g(M,S,F,y,B+1);let C=new Pt,N=I,K=A-F;b.right=C,Zt(e,N,K,C.boundingData,y),g(C,N,K,y,B+1)}return b}}function rn(n,e){let t=n.geometry;e.indirect&&(n._indirectBuffer=sn(t,e.useSharedArrayBuffer),Ye(t,e.range)&&!e.verbose&&console.warn('MeshBVH: Provided geometry contains groups or a range that do not fully span the vertex contents while using the "indirect" option. BVH may incorrectly report intersections on unrendered portions of the geometry.')),n._indirectBuffer||je(t,e);let i=e.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,o=Ze(t),a=e.indirect?Ce(t,e.range):ze(t,e.range);n._roots=a.map(s=>{let c=on(n,o,s.offset,s.count,e),r=ie(c),d=new i(Mt*r);return nn(0,c,d),d})}var O=class{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(e,t){let i=1/0,o=-1/0;for(let a=0,s=e.length;a<s;a++){let r=e[a][t];i=r<i?r:i,o=r>o?r:o}this.min=i,this.max=o}setFromPoints(e,t){let i=1/0,o=-1/0;for(let a=0,s=t.length;a<s;a++){let c=t[a],r=e.dot(c);i=r<i?r:i,o=r>o?r:o}this.min=i,this.max=o}isSeparated(e){return this.min>e.max||e.min>this.max}};O.prototype.setFromBox=(function(){let n=new D;return function(t,i){let o=i.min,a=i.max,s=1/0,c=-1/0;for(let r=0;r<=1;r++)for(let d=0;d<=1;d++)for(let u=0;u<=1;u++){n.x=o.x*r+a.x*(1-r),n.y=o.y*d+a.y*(1-d),n.z=o.z*u+a.z*(1-u);let f=t.dot(n);s=Math.min(f,s),c=Math.max(f,c)}this.min=s,this.max=c}})();var yi=(function(){let n=new O;return function(t,i){let o=t.points,a=t.satAxes,s=t.satBounds,c=i.points,r=i.satAxes,d=i.satBounds;for(let u=0;u<3;u++){let f=s[u],l=a[u];if(n.setFromPoints(l,c),f.isSeparated(n))return!1}for(let u=0;u<3;u++){let f=d[u],l=r[u];if(n.setFromPoints(l,o),f.isSeparated(n))return!1}}})(),cn=(function(){let n=new D,e=new D,t=new D;return function(o,a,s){let c=o.start,r=n,d=a.start,u=e;t.subVectors(c,d),n.subVectors(o.end,o.start),e.subVectors(a.end,a.start);let f=t.dot(u),l=u.dot(r),p=u.dot(u),w=t.dot(r),y=r.dot(r)*p-l*l,m,h;y!==0?m=(f*l-w*p)/y:m=0,h=(f+m*l)/p,s.x=m,s.y=h}})(),ye=(function(){let n=new ht,e=new D,t=new D;return function(o,a,s,c){cn(o,a,n);let r=n.x,d=n.y;if(r>=0&&r<=1&&d>=0&&d<=1){o.at(r,s),a.at(d,c);return}else if(r>=0&&r<=1){d<0?a.at(0,c):a.at(1,c),o.closestPointToPoint(c,!0,s);return}else if(d>=0&&d<=1){r<0?o.at(0,s):o.at(1,s),a.closestPointToPoint(s,!0,c);return}else{let u;r<0?u=o.start:u=o.end;let f;d<0?f=a.start:f=a.end;let l=e,p=t;if(o.closestPointToPoint(f,!0,e),a.closestPointToPoint(u,!0,t),l.distanceToSquared(f)<=p.distanceToSquared(u)){s.copy(l),c.copy(f);return}else{s.copy(u),c.copy(p);return}}}})(),an=(function(){let n=new D,e=new D,t=new De,i=new Z;return function(a,s){let{radius:c,center:r}=a,{a:d,b:u,c:f}=s;if(i.start=d,i.end=u,i.closestPointToPoint(r,!0,n).distanceTo(r)<=c||(i.start=d,i.end=f,i.closestPointToPoint(r,!0,n).distanceTo(r)<=c)||(i.start=u,i.end=f,i.closestPointToPoint(r,!0,n).distanceTo(r)<=c))return!0;let v=s.getPlane(t);if(Math.abs(v.distanceToPoint(r))<=c){let m=v.projectPoint(r,e);if(s.containsPoint(m))return!0}return!1}})(),ln=1e-15;function Kt(n){return Math.abs(n)<ln}var V=class extends dt{constructor(...e){super(...e),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new D),this.satBounds=new Array(4).fill().map(()=>new O),this.points=[this.a,this.b,this.c],this.sphere=new Ue,this.plane=new De,this.needsUpdate=!0}intersectsSphere(e){return an(e,this)}update(){let e=this.a,t=this.b,i=this.c,o=this.points,a=this.satAxes,s=this.satBounds,c=a[0],r=s[0];this.getNormal(c),r.setFromPoints(c,o);let d=a[1],u=s[1];d.subVectors(e,t),u.setFromPoints(d,o);let f=a[2],l=s[2];f.subVectors(t,i),l.setFromPoints(f,o);let p=a[3],w=s[3];p.subVectors(i,e),w.setFromPoints(p,o),this.sphere.setFromPoints(this.points),this.plane.setFromNormalAndCoplanarPoint(c,e),this.needsUpdate=!1}};V.prototype.closestPointToSegment=(function(){let n=new D,e=new D,t=new Z;return function(o,a=null,s=null){let{start:c,end:r}=o,d=this.points,u,f=1/0;for(let l=0;l<3;l++){let p=(l+1)%3;t.start.copy(d[l]),t.end.copy(d[p]),ye(t,o,n,e),u=n.distanceToSquared(e),u<f&&(f=u,a&&a.copy(n),s&&s.copy(e))}return this.closestPointToPoint(c,n),u=c.distanceToSquared(n),u<f&&(f=u,a&&a.copy(n),s&&s.copy(c)),this.closestPointToPoint(r,n),u=r.distanceToSquared(n),u<f&&(f=u,a&&a.copy(n),s&&s.copy(r)),Math.sqrt(f)}})();V.prototype.intersectsTriangle=(function(){let n=new V,e=new Array(3),t=new Array(3),i=new O,o=new O,a=new D,s=new D,c=new D,r=new D,d=new D,u=new Z,f=new Z,l=new Z,p=new D;function w(v,y,m){let h=v.points,x=0,g=-1;for(let b=0;b<3;b++){let{start:T,end:A}=u;T.copy(h[b]),A.copy(h[(b+1)%3]),u.delta(s);let _=Kt(y.distanceToPoint(T));if(Kt(y.normal.dot(s))&&_){m.copy(u),x=2;break}let B=y.intersectLine(u,p);if(!B&&_&&p.copy(T),(B||_)&&!Kt(p.distanceTo(A))){if(x<=1)(x===1?m.start:m.end).copy(p),_&&(g=x);else if(x>=2){(g===1?m.start:m.end).copy(p),x=2;break}if(x++,x===2&&g===-1)break}}return x}return function(y,m=null,h=!1){this.needsUpdate&&this.update(),y.isExtendedTriangle?y.needsUpdate&&y.update():(n.copy(y),n.update(),y=n);let x=this.plane,g=y.plane;if(Math.abs(x.normal.dot(g.normal))>1-1e-10){let b=this.satBounds,T=this.satAxes;t[0]=y.a,t[1]=y.b,t[2]=y.c;for(let B=0;B<4;B++){let P=b[B],I=T[B];if(i.setFromPoints(I,t),P.isSeparated(i))return!1}let A=y.satBounds,_=y.satAxes;e[0]=this.a,e[1]=this.b,e[2]=this.c;for(let B=0;B<4;B++){let P=A[B],I=_[B];if(i.setFromPoints(I,e),P.isSeparated(i))return!1}for(let B=0;B<4;B++){let P=T[B];for(let I=0;I<4;I++){let M=_[I];if(a.crossVectors(P,M),i.setFromPoints(a,e),o.setFromPoints(a,t),i.isSeparated(o))return!1}}return m&&(h||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),m.start.set(0,0,0),m.end.set(0,0,0)),!0}else{let b=w(this,g,f);if(b===1&&y.containsPoint(f.end))return m&&(m.start.copy(f.end),m.end.copy(f.end)),!0;if(b!==2)return!1;let T=w(y,x,l);if(T===1&&this.containsPoint(l.end))return m&&(m.start.copy(l.end),m.end.copy(l.end)),!0;if(T!==2)return!1;if(f.delta(c),l.delta(r),c.dot(r)<0){let S=l.start;l.start=l.end,l.end=S}let A=f.start.dot(c),_=f.end.dot(c),B=l.start.dot(c),P=l.end.dot(c),I=_<B,M=A<P;return A!==P&&B!==_&&I===M?!1:(m&&(d.subVectors(f.start,l.start),d.dot(c)>0?m.start.copy(f.start):m.start.copy(l.start),d.subVectors(f.end,l.end),d.dot(c)<0?m.end.copy(f.end):m.end.copy(l.end)),!0)}}})();V.prototype.distanceToPoint=(function(){let n=new D;return function(t){return this.closestPointToPoint(t,n),t.distanceTo(n)}})();V.prototype.distanceToTriangle=(function(){let n=new D,e=new D,t=["a","b","c"],i=new Z,o=new Z;return function(s,c=null,r=null){let d=c||r?i:null;if(this.intersectsTriangle(s,d))return(c||r)&&(c&&d.getCenter(c),r&&d.getCenter(r)),0;let u=1/0;for(let f=0;f<3;f++){let l,p=t[f],w=s[p];this.closestPointToPoint(w,n),l=w.distanceToSquared(n),l<u&&(u=l,c&&c.copy(n),r&&r.copy(w));let v=this[p];s.closestPointToPoint(v,n),l=v.distanceToSquared(n),l<u&&(u=l,c&&c.copy(v),r&&r.copy(n))}for(let f=0;f<3;f++){let l=t[f],p=t[(f+1)%3];i.set(this[l],this[p]);for(let w=0;w<3;w++){let v=t[w],y=t[(w+1)%3];o.set(s[v],s[y]),ye(i,o,n,e);let m=n.distanceToSquared(e);m<u&&(u=m,c&&c.copy(n),r&&r.copy(e))}}return Math.sqrt(u)}})();var U=class{constructor(e,t,i){this.isOrientedBox=!0,this.min=new D,this.max=new D,this.matrix=new st,this.invMatrix=new st,this.points=new Array(8).fill().map(()=>new D),this.satAxes=new Array(3).fill().map(()=>new D),this.satBounds=new Array(3).fill().map(()=>new O),this.alignedSatBounds=new Array(3).fill().map(()=>new O),this.needsUpdate=!1,e&&this.min.copy(e),t&&this.max.copy(t),i&&this.matrix.copy(i)}set(e,t,i){this.min.copy(e),this.max.copy(t),this.matrix.copy(i),this.needsUpdate=!0}copy(e){this.min.copy(e.min),this.max.copy(e.max),this.matrix.copy(e.matrix),this.needsUpdate=!0}};U.prototype.update=(function(){return function(){let e=this.matrix,t=this.min,i=this.max,o=this.points;for(let d=0;d<=1;d++)for(let u=0;u<=1;u++)for(let f=0;f<=1;f++){let l=1*d|2*u|4*f,p=o[l];p.x=d?i.x:t.x,p.y=u?i.y:t.y,p.z=f?i.z:t.z,p.applyMatrix4(e)}let a=this.satBounds,s=this.satAxes,c=o[0];for(let d=0;d<3;d++){let u=s[d],f=a[d],l=1<<d,p=o[l];u.subVectors(c,p),f.setFromPoints(u,o)}let r=this.alignedSatBounds;r[0].setFromPointsField(o,"x"),r[1].setFromPointsField(o,"y"),r[2].setFromPointsField(o,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})();U.prototype.intersectsBox=(function(){let n=new O;return function(t){this.needsUpdate&&this.update();let i=t.min,o=t.max,a=this.satBounds,s=this.satAxes,c=this.alignedSatBounds;if(n.min=i.x,n.max=o.x,c[0].isSeparated(n)||(n.min=i.y,n.max=o.y,c[1].isSeparated(n))||(n.min=i.z,n.max=o.z,c[2].isSeparated(n)))return!1;for(let r=0;r<3;r++){let d=s[r],u=a[r];if(n.setFromBox(d,t),u.isSeparated(n))return!1}return!0}})();U.prototype.intersectsTriangle=(function(){let n=new V,e=new Array(3),t=new O,i=new O,o=new D;return function(s){this.needsUpdate&&this.update(),s.isExtendedTriangle?s.needsUpdate&&s.update():(n.copy(s),n.update(),s=n);let c=this.satBounds,r=this.satAxes;e[0]=s.a,e[1]=s.b,e[2]=s.c;for(let l=0;l<3;l++){let p=c[l],w=r[l];if(t.setFromPoints(w,e),p.isSeparated(t))return!1}let d=s.satBounds,u=s.satAxes,f=this.points;for(let l=0;l<3;l++){let p=d[l],w=u[l];if(t.setFromPoints(w,f),p.isSeparated(t))return!1}for(let l=0;l<3;l++){let p=r[l];for(let w=0;w<4;w++){let v=u[w];if(o.crossVectors(p,v),t.setFromPoints(o,e),i.setFromPoints(o,f),t.isSeparated(i))return!1}}return!0}})();U.prototype.closestPointToPoint=(function(){return function(e,t){return this.needsUpdate&&this.update(),t.copy(e).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),t}})();U.prototype.distanceToPoint=(function(){let n=new D;return function(t){return this.closestPointToPoint(t,n),t.distanceTo(n)}})();U.prototype.distanceToBox=(function(){let n=["x","y","z"],e=new Array(12).fill().map(()=>new Z),t=new Array(12).fill().map(()=>new Z),i=new D,o=new D;return function(s,c=0,r=null,d=null){if(this.needsUpdate&&this.update(),this.intersectsBox(s))return(r||d)&&(s.getCenter(o),this.closestPointToPoint(o,i),s.closestPointToPoint(i,o),r&&r.copy(i),d&&d.copy(o)),0;let u=c*c,f=s.min,l=s.max,p=this.points,w=1/0;for(let y=0;y<8;y++){let m=p[y];o.copy(m).clamp(f,l);let h=m.distanceToSquared(o);if(h<w&&(w=h,r&&r.copy(m),d&&d.copy(o),h<u))return Math.sqrt(h)}let v=0;for(let y=0;y<3;y++)for(let m=0;m<=1;m++)for(let h=0;h<=1;h++){let x=(y+1)%3,g=(y+2)%3,b=m<<x|h<<g,T=1<<y|m<<x|h<<g,A=p[b],_=p[T];e[v].set(A,_);let P=n[y],I=n[x],M=n[g],S=t[v],F=S.start,C=S.end;F[P]=f[P],F[I]=m?f[I]:l[I],F[M]=h?f[M]:l[I],C[P]=l[P],C[I]=m?f[I]:l[I],C[M]=h?f[M]:l[I],v++}for(let y=0;y<=1;y++)for(let m=0;m<=1;m++)for(let h=0;h<=1;h++){o.x=y?l.x:f.x,o.y=m?l.y:f.y,o.z=h?l.z:f.z,this.closestPointToPoint(o,i);let x=o.distanceToSquared(i);if(x<w&&(w=x,r&&r.copy(i),d&&d.copy(o),x<u))return Math.sqrt(x)}for(let y=0;y<12;y++){let m=e[y];for(let h=0;h<12;h++){let x=t[h];ye(m,x,i,o);let g=i.distanceToSquared(o);if(g<w&&(w=g,r&&r.copy(i),d&&d.copy(o),g<u))return Math.sqrt(g)}}return Math.sqrt(w)}})();var St=class{constructor(e){this._getNewPrimitive=e,this._primitives=[]}getPrimitive(){let e=this._primitives;return e.length===0?this._getNewPrimitive():e.pop()}releasePrimitive(e){this._primitives.push(e)}},oe=class extends St{constructor(){super(()=>new V)}},X=new oe,re=class{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;let e=[],t=null;this.setBuffer=i=>{t&&e.push(t),t=i,this.float32Array=new Float32Array(i),this.uint16Array=new Uint16Array(i),this.uint32Array=new Uint32Array(i)},this.clearBuffer=()=>{t=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,e.length!==0&&this.setBuffer(e.pop())}}},z=new re,G,pt,ot=[],Ct=new St(()=>new j);function un(n,e,t,i,o,a){G=Ct.getPrimitive(),pt=Ct.getPrimitive(),ot.push(G,pt),z.setBuffer(n._roots[e]);let s=ce(0,n.geometry,t,i,o,a);z.clearBuffer(),Ct.releasePrimitive(G),Ct.releasePrimitive(pt),ot.pop(),ot.pop();let c=ot.length;return c>0&&(pt=ot[c-1],G=ot[c-2]),s}function ce(n,e,t,i,o=null,a=0,s=0){let{float32Array:c,uint16Array:r,uint32Array:d}=z,u=n*2;if(L(u,r)){let l=k(n,d),p=q(u,r);return E(n,c,G),i(l,p,!1,s,a+n,G)}else{let P=function(M){let{uint16Array:S,uint32Array:F}=z,C=M*2;for(;!L(C,S);)M=H(M),C=M*2;return k(M,F)},I=function(M){let{uint16Array:S,uint32Array:F}=z,C=M*2;for(;!L(C,S);)M=W(M,F),C=M*2;return k(M,F)+q(C,S)},l=H(n),p=W(n,d),w=l,v=p,y,m,h,x;if(o&&(h=G,x=pt,E(w,c,h),E(v,c,x),y=o(h),m=o(x),m<y)){w=p,v=l;let M=y;y=m,m=M,h=x}h||(h=G,E(w,c,h));let g=L(w*2,r),b=t(h,g,y,s+1,a+w),T;if(b===be){let M=P(w),F=I(w)-M;T=i(M,F,!0,s+1,a+w,h)}else T=b&&ce(w,e,t,i,o,a,s+1);if(T)return!0;x=pt,E(v,c,x);let A=L(v*2,r),_=t(x,A,m,s+1,a+v),B;if(_===be){let M=P(v),F=I(v)-M;B=i(M,F,!0,s+1,a+v,x)}else B=_&&ce(v,e,t,i,o,a,s+1);return!!B}}var gt=new D,Jt=new D;function fn(n,e,t={},i=0,o=1/0){let a=i*i,s=o*o,c=1/0,r=null;if(n.shapecast({boundsTraverseOrder:u=>(gt.copy(e).clamp(u.min,u.max),gt.distanceToSquared(e)),intersectsBounds:(u,f,l)=>l<c&&l<s,intersectsTriangle:(u,f)=>{u.closestPointToPoint(e,gt);let l=e.distanceToSquared(gt);return l<c&&(Jt.copy(gt),c=l,r=f),l<a}}),c===1/0)return null;let d=Math.sqrt(c);return t.point?t.point.copy(Jt):t.point=Jt.clone(),t.distance=d,t.faceIndex=r,t}var dn=parseInt(Fe)>=169,et=new D,nt=new D,it=new D,zt=new ht,Et=new ht,Nt=new ht,Te=new D,Be=new D,_e=new D,wt=new D;function pn(n,e,t,i,o,a,s,c){let r;if(a===Le?r=n.intersectTriangle(i,t,e,!0,o):r=n.intersectTriangle(e,t,i,a!==ke,o),r===null)return null;let d=n.origin.distanceTo(o);return d<s||d>c?null:{distance:d,point:o.clone()}}function hn(n,e,t,i,o,a,s,c,r,d,u){et.fromBufferAttribute(e,a),nt.fromBufferAttribute(e,s),it.fromBufferAttribute(e,c);let f=pn(n,et,nt,it,wt,r,d,u);if(f){let l=new D;dt.getBarycoord(wt,et,nt,it,l),i&&(zt.fromBufferAttribute(i,a),Et.fromBufferAttribute(i,s),Nt.fromBufferAttribute(i,c),f.uv=dt.getInterpolation(wt,et,nt,it,zt,Et,Nt,new ht)),o&&(zt.fromBufferAttribute(o,a),Et.fromBufferAttribute(o,s),Nt.fromBufferAttribute(o,c),f.uv1=dt.getInterpolation(wt,et,nt,it,zt,Et,Nt,new ht)),t&&(Te.fromBufferAttribute(t,a),Be.fromBufferAttribute(t,s),_e.fromBufferAttribute(t,c),f.normal=dt.getInterpolation(wt,et,nt,it,Te,Be,_e,new D),f.normal.dot(n.direction)>0&&f.normal.multiplyScalar(-1));let p={a,b:s,c,normal:new D,materialIndex:0};dt.getNormal(et,nt,it,p.normal),f.face=p,f.faceIndex=a,dn&&(f.barycoord=l)}return f}function $t(n,e,t,i,o,a,s){let c=i*3,r=c+0,d=c+1,u=c+2,f=n.index;n.index&&(r=f.getX(r),d=f.getX(d),u=f.getX(u));let{position:l,normal:p,uv:w,uv1:v}=n.attributes,y=hn(t,l,p,w,v,r,d,u,e,a,s);return y?(y.faceIndex=i,o&&o.push(y),y):null}function R(n,e,t,i){let o=n.a,a=n.b,s=n.c,c=e,r=e+1,d=e+2;t&&(c=t.getX(c),r=t.getX(r),d=t.getX(d)),o.x=i.getX(c),o.y=i.getY(c),o.z=i.getZ(c),a.x=i.getX(r),a.y=i.getY(r),a.z=i.getZ(r),s.x=i.getX(d),s.y=i.getY(d),s.z=i.getZ(d)}function mn(n,e,t,i,o,a,s,c){let{geometry:r,_indirectBuffer:d}=n;for(let u=i,f=i+o;u<f;u++)$t(r,e,t,u,a,s,c)}function yn(n,e,t,i,o,a,s){let{geometry:c,_indirectBuffer:r}=n,d=1/0,u=null;for(let f=i,l=i+o;f<l;f++){let p;p=$t(c,e,t,f,null,a,s),p&&p.distance<d&&(u=p,d=p.distance)}return u}function xn(n,e,t,i,o,a,s){let{geometry:c}=t,{index:r}=c,d=c.attributes.position;for(let u=n,f=e+n;u<f;u++){let l;if(l=u,R(s,l*3,r,d),s.needsUpdate=!0,i(s,l,o,a))return!0}return!1}function bn(n,e=null){e&&Array.isArray(e)&&(e=new Set(e));let t=n.geometry,i=t.index?t.index.array:null,o=t.attributes.position,a,s,c,r,d=0,u=n._roots;for(let l=0,p=u.length;l<p;l++)a=u[l],s=new Uint32Array(a),c=new Uint16Array(a),r=new Float32Array(a),f(0,d),d+=a.byteLength;function f(l,p,w=!1){let v=l*2;if(c[v+15]===Ot){let m=s[l+6],h=c[v+14],x=1/0,g=1/0,b=1/0,T=-1/0,A=-1/0,_=-1/0;for(let B=3*m,P=3*(m+h);B<P;B++){let I=i[B],M=o.getX(I),S=o.getY(I),F=o.getZ(I);M<x&&(x=M),M>T&&(T=M),S<g&&(g=S),S>A&&(A=S),F<b&&(b=F),F>_&&(_=F)}return r[l+0]!==x||r[l+1]!==g||r[l+2]!==b||r[l+3]!==T||r[l+4]!==A||r[l+5]!==_?(r[l+0]=x,r[l+1]=g,r[l+2]=b,r[l+3]=T,r[l+4]=A,r[l+5]=_,!0):!1}else{let m=l+8,h=s[l+6],x=m+p,g=h+p,b=w,T=!1,A=!1;e?b||(T=e.has(x),A=e.has(g),b=!T&&!A):(T=!0,A=!0);let _=b||T,B=b||A,P=!1;_&&(P=f(m,p,b));let I=!1;B&&(I=f(h,p,b));let M=P||I;if(M)for(let S=0;S<3;S++){let F=m+S,C=h+S,N=r[F],K=r[F+3],yt=r[C],xt=r[C+3];r[l+S]=N<yt?N:yt,r[l+S+3]=K>xt?K:xt}return M}}}function tt(n,e,t,i,o){let a,s,c,r,d,u,f=1/t.direction.x,l=1/t.direction.y,p=1/t.direction.z,w=t.origin.x,v=t.origin.y,y=t.origin.z,m=e[n],h=e[n+3],x=e[n+1],g=e[n+3+1],b=e[n+2],T=e[n+3+2];return f>=0?(a=(m-w)*f,s=(h-w)*f):(a=(h-w)*f,s=(m-w)*f),l>=0?(c=(x-v)*l,r=(g-v)*l):(c=(g-v)*l,r=(x-v)*l),a>r||c>s||((c>a||isNaN(a))&&(a=c),(r<s||isNaN(s))&&(s=r),p>=0?(d=(b-y)*p,u=(T-y)*p):(d=(T-y)*p,u=(b-y)*p),a>u||d>s)?!1:((d>a||a!==a)&&(a=d),(u<s||s!==s)&&(s=u),a<=o&&s>=i)}function gn(n,e,t,i,o,a,s,c){let{geometry:r,_indirectBuffer:d}=n;for(let u=i,f=i+o;u<f;u++){let l=d?d[u]:u;$t(r,e,t,l,a,s,c)}}function wn(n,e,t,i,o,a,s){let{geometry:c,_indirectBuffer:r}=n,d=1/0,u=null;for(let f=i,l=i+o;f<l;f++){let p;p=$t(c,e,t,r?r[f]:f,null,a,s),p&&p.distance<d&&(u=p,d=p.distance)}return u}function vn(n,e,t,i,o,a,s){let{geometry:c}=t,{index:r}=c,d=c.attributes.position;for(let u=n,f=e+n;u<f;u++){let l;if(l=t.resolveTriangleIndex(u),R(s,l*3,r,d),s.needsUpdate=!0,i(s,l,o,a))return!0}return!1}function An(n,e,t,i,o,a,s){z.setBuffer(n._roots[e]),ae(0,n,t,i,o,a,s),z.clearBuffer()}function ae(n,e,t,i,o,a,s){let{float32Array:c,uint16Array:r,uint32Array:d}=z,u=n*2;if(L(u,r)){let l=k(n,d),p=q(u,r);mn(e,t,i,l,p,o,a,s)}else{let l=H(n);tt(l,c,i,a,s)&&ae(l,e,t,i,o,a,s);let p=W(n,d);tt(p,c,i,a,s)&&ae(p,e,t,i,o,a,s)}}var Tn=["x","y","z"];function Bn(n,e,t,i,o,a){z.setBuffer(n._roots[e]);let s=le(0,n,t,i,o,a);return z.clearBuffer(),s}function le(n,e,t,i,o,a){let{float32Array:s,uint16Array:c,uint32Array:r}=z,d=n*2;if(L(d,c)){let f=k(n,r),l=q(d,c);return yn(e,t,i,f,l,o,a)}else{let f=Ee(n,r),l=Tn[f],w=i.direction[l]>=0,v,y;w?(v=H(n),y=W(n,r)):(v=W(n,r),y=H(n));let h=tt(v,s,i,o,a)?le(v,e,t,i,o,a):null;if(h){let b=h.point[l];if(w?b<=s[y+f]:b>=s[y+f+3])return h}let g=tt(y,s,i,o,a)?le(y,e,t,i,o,a):null;return h&&g?h.distance<=g.distance?h:g:h||g||null}}var Rt=new j,rt=new V,ct=new V,vt=new st,Me=new U,Ut=new U;function _n(n,e,t,i){z.setBuffer(n._roots[e]);let o=ue(0,n,t,i);return z.clearBuffer(),o}function ue(n,e,t,i,o=null){let{float32Array:a,uint16Array:s,uint32Array:c}=z,r=n*2;if(o===null&&(t.boundingBox||t.computeBoundingBox(),Me.set(t.boundingBox.min,t.boundingBox.max,i),o=Me),L(r,s)){let u=e.geometry,f=u.index,l=u.attributes.position,p=t.index,w=t.attributes.position,v=k(n,c),y=q(r,s);if(vt.copy(i).invert(),t.boundsTree)return E(n,a,Ut),Ut.matrix.copy(vt),Ut.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:h=>Ut.intersectsBox(h),intersectsTriangle:h=>{h.a.applyMatrix4(i),h.b.applyMatrix4(i),h.c.applyMatrix4(i),h.needsUpdate=!0;for(let x=v*3,g=(y+v)*3;x<g;x+=3)if(R(ct,x,f,l),ct.needsUpdate=!0,h.intersectsTriangle(ct))return!0;return!1}});for(let m=v*3,h=(y+v)*3;m<h;m+=3){R(rt,m,f,l),rt.a.applyMatrix4(vt),rt.b.applyMatrix4(vt),rt.c.applyMatrix4(vt),rt.needsUpdate=!0;for(let x=0,g=p.count;x<g;x+=3)if(R(ct,x,p,w),ct.needsUpdate=!0,rt.intersectsTriangle(ct))return!0}}else{let u=n+8,f=c[n+6];return E(u,a,Rt),!!(o.intersectsBox(Rt)&&ue(u,e,t,i,o)||(E(f,a,Rt),o.intersectsBox(Rt)&&ue(f,e,t,i,o)))}}var Lt=new st,Qt=new U,At=new U,Mn=new D,Pn=new D,In=new D,Sn=new D;function Dn(n,e,t,i={},o={},a=0,s=1/0){e.boundingBox||e.computeBoundingBox(),Qt.set(e.boundingBox.min,e.boundingBox.max,t),Qt.needsUpdate=!0;let c=n.geometry,r=c.attributes.position,d=c.index,u=e.attributes.position,f=e.index,l=X.getPrimitive(),p=X.getPrimitive(),w=Mn,v=Pn,y=null,m=null;o&&(y=In,m=Sn);let h=1/0,x=null,g=null;return Lt.copy(t).invert(),At.matrix.copy(Lt),n.shapecast({boundsTraverseOrder:b=>Qt.distanceToBox(b),intersectsBounds:(b,T,A)=>A<h&&A<s?(T&&(At.min.copy(b.min),At.max.copy(b.max),At.needsUpdate=!0),!0):!1,intersectsRange:(b,T)=>{if(e.boundsTree)return e.boundsTree.shapecast({boundsTraverseOrder:_=>At.distanceToBox(_),intersectsBounds:(_,B,P)=>P<h&&P<s,intersectsRange:(_,B)=>{for(let P=_,I=_+B;P<I;P++){R(p,3*P,f,u),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let M=b,S=b+T;M<S;M++){R(l,3*M,d,r),l.needsUpdate=!0;let F=l.distanceToTriangle(p,w,y);if(F<h&&(v.copy(w),m&&m.copy(y),h=F,x=M,g=P),F<a)return!0}}}});{let A=mt(e);for(let _=0,B=A;_<B;_++){R(p,3*_,f,u),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let P=b,I=b+T;P<I;P++){R(l,3*P,d,r),l.needsUpdate=!0;let M=l.distanceToTriangle(p,w,y);if(M<h&&(v.copy(w),m&&m.copy(y),h=M,x=P,g=_),M<a)return!0}}}}}),X.releasePrimitive(l),X.releasePrimitive(p),h===1/0?null:(i.point?i.point.copy(v):i.point=v.clone(),i.distance=h,i.faceIndex=x,o&&(o.point?o.point.copy(m):o.point=m.clone(),o.point.applyMatrix4(Lt),v.applyMatrix4(Lt),o.distance=v.sub(o.point).length(),o.faceIndex=g),i)}function Fn(n,e=null){e&&Array.isArray(e)&&(e=new Set(e));let t=n.geometry,i=t.index?t.index.array:null,o=t.attributes.position,a,s,c,r,d=0,u=n._roots;for(let l=0,p=u.length;l<p;l++)a=u[l],s=new Uint32Array(a),c=new Uint16Array(a),r=new Float32Array(a),f(0,d),d+=a.byteLength;function f(l,p,w=!1){let v=l*2;if(c[v+15]===Ot){let m=s[l+6],h=c[v+14],x=1/0,g=1/0,b=1/0,T=-1/0,A=-1/0,_=-1/0;for(let B=m,P=m+h;B<P;B++){let I=3*n.resolveTriangleIndex(B);for(let M=0;M<3;M++){let S=I+M;S=i?i[S]:S;let F=o.getX(S),C=o.getY(S),N=o.getZ(S);F<x&&(x=F),F>T&&(T=F),C<g&&(g=C),C>A&&(A=C),N<b&&(b=N),N>_&&(_=N)}}return r[l+0]!==x||r[l+1]!==g||r[l+2]!==b||r[l+3]!==T||r[l+4]!==A||r[l+5]!==_?(r[l+0]=x,r[l+1]=g,r[l+2]=b,r[l+3]=T,r[l+4]=A,r[l+5]=_,!0):!1}else{let m=l+8,h=s[l+6],x=m+p,g=h+p,b=w,T=!1,A=!1;e?b||(T=e.has(x),A=e.has(g),b=!T&&!A):(T=!0,A=!0);let _=b||T,B=b||A,P=!1;_&&(P=f(m,p,b));let I=!1;B&&(I=f(h,p,b));let M=P||I;if(M)for(let S=0;S<3;S++){let F=m+S,C=h+S,N=r[F],K=r[F+3],yt=r[C],xt=r[C+3];r[l+S]=N<yt?N:yt,r[l+S+3]=K>xt?K:xt}return M}}}function Cn(n,e,t,i,o,a,s){z.setBuffer(n._roots[e]),fe(0,n,t,i,o,a,s),z.clearBuffer()}function fe(n,e,t,i,o,a,s){let{float32Array:c,uint16Array:r,uint32Array:d}=z,u=n*2;if(L(u,r)){let l=k(n,d),p=q(u,r);gn(e,t,i,l,p,o,a,s)}else{let l=H(n);tt(l,c,i,a,s)&&fe(l,e,t,i,o,a,s);let p=W(n,d);tt(p,c,i,a,s)&&fe(p,e,t,i,o,a,s)}}var zn=["x","y","z"];function En(n,e,t,i,o,a){z.setBuffer(n._roots[e]);let s=de(0,n,t,i,o,a);return z.clearBuffer(),s}function de(n,e,t,i,o,a){let{float32Array:s,uint16Array:c,uint32Array:r}=z,d=n*2;if(L(d,c)){let f=k(n,r),l=q(d,c);return wn(e,t,i,f,l,o,a)}else{let f=Ee(n,r),l=zn[f],w=i.direction[l]>=0,v,y;w?(v=H(n),y=W(n,r)):(v=W(n,r),y=H(n));let h=tt(v,s,i,o,a)?de(v,e,t,i,o,a):null;if(h){let b=h.point[l];if(w?b<=s[y+f]:b>=s[y+f+3])return h}let g=tt(y,s,i,o,a)?de(y,e,t,i,o,a):null;return h&&g?h.distance<=g.distance?h:g:h||g||null}}var kt=new j,at=new V,lt=new V,Tt=new st,Pe=new U,Vt=new U;function Nn(n,e,t,i){z.setBuffer(n._roots[e]);let o=pe(0,n,t,i);return z.clearBuffer(),o}function pe(n,e,t,i,o=null){let{float32Array:a,uint16Array:s,uint32Array:c}=z,r=n*2;if(o===null&&(t.boundingBox||t.computeBoundingBox(),Pe.set(t.boundingBox.min,t.boundingBox.max,i),o=Pe),L(r,s)){let u=e.geometry,f=u.index,l=u.attributes.position,p=t.index,w=t.attributes.position,v=k(n,c),y=q(r,s);if(Tt.copy(i).invert(),t.boundsTree)return E(n,a,Vt),Vt.matrix.copy(Tt),Vt.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:h=>Vt.intersectsBox(h),intersectsTriangle:h=>{h.a.applyMatrix4(i),h.b.applyMatrix4(i),h.c.applyMatrix4(i),h.needsUpdate=!0;for(let x=v,g=y+v;x<g;x++)if(R(lt,3*e.resolveTriangleIndex(x),f,l),lt.needsUpdate=!0,h.intersectsTriangle(lt))return!0;return!1}});for(let m=v,h=y+v;m<h;m++){let x=e.resolveTriangleIndex(m);R(at,3*x,f,l),at.a.applyMatrix4(Tt),at.b.applyMatrix4(Tt),at.c.applyMatrix4(Tt),at.needsUpdate=!0;for(let g=0,b=p.count;g<b;g+=3)if(R(lt,g,p,w),lt.needsUpdate=!0,at.intersectsTriangle(lt))return!0}}else{let u=n+8,f=c[n+6];return E(u,a,kt),!!(o.intersectsBox(kt)&&pe(u,e,t,i,o)||(E(f,a,kt),o.intersectsBox(kt)&&pe(f,e,t,i,o)))}}var qt=new st,Gt=new U,Bt=new U,Rn=new D,Un=new D,Ln=new D,kn=new D;function Vn(n,e,t,i={},o={},a=0,s=1/0){e.boundingBox||e.computeBoundingBox(),Gt.set(e.boundingBox.min,e.boundingBox.max,t),Gt.needsUpdate=!0;let c=n.geometry,r=c.attributes.position,d=c.index,u=e.attributes.position,f=e.index,l=X.getPrimitive(),p=X.getPrimitive(),w=Rn,v=Un,y=null,m=null;o&&(y=Ln,m=kn);let h=1/0,x=null,g=null;return qt.copy(t).invert(),Bt.matrix.copy(qt),n.shapecast({boundsTraverseOrder:b=>Gt.distanceToBox(b),intersectsBounds:(b,T,A)=>A<h&&A<s?(T&&(Bt.min.copy(b.min),Bt.max.copy(b.max),Bt.needsUpdate=!0),!0):!1,intersectsRange:(b,T)=>{if(e.boundsTree){let A=e.boundsTree;return A.shapecast({boundsTraverseOrder:_=>Bt.distanceToBox(_),intersectsBounds:(_,B,P)=>P<h&&P<s,intersectsRange:(_,B)=>{for(let P=_,I=_+B;P<I;P++){let M=A.resolveTriangleIndex(P);R(p,3*M,f,u),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let S=b,F=b+T;S<F;S++){let C=n.resolveTriangleIndex(S);R(l,3*C,d,r),l.needsUpdate=!0;let N=l.distanceToTriangle(p,w,y);if(N<h&&(v.copy(w),m&&m.copy(y),h=N,x=S,g=P),N<a)return!0}}}})}else{let A=mt(e);for(let _=0,B=A;_<B;_++){R(p,3*_,f,u),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let P=b,I=b+T;P<I;P++){let M=n.resolveTriangleIndex(P);R(l,3*M,d,r),l.needsUpdate=!0;let S=l.distanceToTriangle(p,w,y);if(S<h&&(v.copy(w),m&&m.copy(y),h=S,x=P,g=_),S<a)return!0}}}}}),X.releasePrimitive(l),X.releasePrimitive(p),h===1/0?null:(i.point?i.point.copy(v):i.point=v.clone(),i.distance=h,i.faceIndex=x,o&&(o.point?o.point.copy(m):o.point=m.clone(),o.point.applyMatrix4(qt),v.applyMatrix4(qt),o.distance=v.sub(o.point).length(),o.faceIndex=g),i)}function qn(){return typeof SharedArrayBuffer<"u"}var It=new z.constructor,Xt=new z.constructor,Q=new St(()=>new j),ut=new j,ft=new j,te=new j,ee=new j,ne=!1;function Hn(n,e,t,i){if(ne)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");ne=!0;let o=n._roots,a=e._roots,s,c=0,r=0,d=new st().copy(t).invert();for(let u=0,f=o.length;u<f;u++){It.setBuffer(o[u]),r=0;let l=Q.getPrimitive();E(0,It.float32Array,l),l.applyMatrix4(d);for(let p=0,w=a.length;p<w&&(Xt.setBuffer(a[p]),s=$(0,0,t,d,i,c,r,0,0,l),Xt.clearBuffer(),r+=a[p].length,!s);p++);if(Q.releasePrimitive(l),It.clearBuffer(),c+=o[u].length,s)break}return ne=!1,s}function $(n,e,t,i,o,a=0,s=0,c=0,r=0,d=null,u=!1){let f,l;u?(f=Xt,l=It):(f=It,l=Xt);let p=f.float32Array,w=f.uint32Array,v=f.uint16Array,y=l.float32Array,m=l.uint32Array,h=l.uint16Array,x=n*2,g=e*2,b=L(x,v),T=L(g,h),A=!1;if(T&&b)u?A=o(k(e,m),q(e*2,h),k(n,w),q(n*2,v),r,s+e,c,a+n):A=o(k(n,w),q(n*2,v),k(e,m),q(e*2,h),c,a+n,r,s+e);else if(T){let _=Q.getPrimitive();E(e,y,_),_.applyMatrix4(t);let B=H(n),P=W(n,w);E(B,p,ut),E(P,p,ft);let I=_.intersectsBox(ut),M=_.intersectsBox(ft);A=I&&$(e,B,i,t,o,s,a,r,c+1,_,!u)||M&&$(e,P,i,t,o,s,a,r,c+1,_,!u),Q.releasePrimitive(_)}else{let _=H(e),B=W(e,m);E(_,y,te),E(B,y,ee);let P=d.intersectsBox(te),I=d.intersectsBox(ee);if(P&&I)A=$(n,_,t,i,o,a,s,c,r+1,d,u)||$(n,B,t,i,o,a,s,c,r+1,d,u);else if(P)if(b)A=$(n,_,t,i,o,a,s,c,r+1,d,u);else{let M=Q.getPrimitive();M.copy(te).applyMatrix4(t);let S=H(n),F=W(n,w);E(S,p,ut),E(F,p,ft);let C=M.intersectsBox(ut),N=M.intersectsBox(ft);A=C&&$(_,S,i,t,o,s,a,r,c+1,M,!u)||N&&$(_,F,i,t,o,s,a,r,c+1,M,!u),Q.releasePrimitive(M)}else if(I)if(b)A=$(n,B,t,i,o,a,s,c,r+1,d,u);else{let M=Q.getPrimitive();M.copy(ee).applyMatrix4(t);let S=H(n),F=W(n,w);E(S,p,ut),E(F,p,ft);let C=M.intersectsBox(ut),N=M.intersectsBox(ft);A=C&&$(B,S,i,t,o,s,a,r,c+1,M,!u)||N&&$(B,F,i,t,o,s,a,r,c+1,M,!u),Q.releasePrimitive(M)}}return A}var Ht=new U,Ie=new j,Wn={strategy:me,maxDepth:40,maxLeafTris:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null},he=class n{static serialize(e,t={}){t={cloneBuffers:!0,...t};let i=e.geometry,o=e._roots,a=e._indirectBuffer,s=i.getIndex(),c;return t.cloneBuffers?c={roots:o.map(r=>r.slice()),index:s?s.array.slice():null,indirectBuffer:a?a.slice():null}:c={roots:o,index:s?s.array:null,indirectBuffer:a},c}static deserialize(e,t,i={}){i={setIndex:!0,indirect:!!e.indirectBuffer,...i};let{index:o,roots:a,indirectBuffer:s}=e,c=new n(t,{...i,[Yt]:!0});if(c._roots=a,c._indirectBuffer=s||null,i.setIndex){let r=t.getIndex();if(r===null){let d=new Se(e.index,1,!1);t.setIndex(d)}else r.array!==o&&(r.array.set(o),r.needsUpdate=!0)}return c}get indirect(){return!!this._indirectBuffer}constructor(e,t={}){if(e.isBufferGeometry){if(e.index&&e.index.isInterleavedBufferAttribute)throw new Error("MeshBVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("MeshBVH: Only BufferGeometries are supported.");if(t=Object.assign({...Wn,[Yt]:!1},t),t.useSharedArrayBuffer&&!qn())throw new Error("MeshBVH: SharedArrayBuffer is not available.");this.geometry=e,this._roots=null,this._indirectBuffer=null,t[Yt]||(rn(this,t),!e.boundingBox&&t.setBoundingBox&&(e.boundingBox=this.getBoundingBox(new j))),this.resolveTriangleIndex=t.indirect?i=>this._indirectBuffer[i]:i=>i}refit(e=null){return(this.indirect?Fn:bn)(this,e)}traverse(e,t=0){let i=this._roots[t],o=new Uint32Array(i),a=new Uint16Array(i);s(0);function s(c,r=0){let d=c*2,u=a[d+15]===Ot;if(u){let f=o[c+6],l=a[d+14];e(r,u,new Float32Array(i,c*4,6),f,l)}else{let f=c+Mt/4,l=o[c+6],p=o[c+7];e(r,u,new Float32Array(i,c*4,6),p)||(s(f,r+1),s(l,r+1))}}}raycast(e,t=xe,i=0,o=1/0){let a=this._roots,s=this.geometry,c=[],r=t.isMaterial,d=Array.isArray(t),u=s.groups,f=r?t.side:t,l=this.indirect?Cn:An;for(let p=0,w=a.length;p<w;p++){let v=d?t[u[p].materialIndex].side:f,y=c.length;if(l(this,p,v,e,c,i,o),d){let m=u[p].materialIndex;for(let h=y,x=c.length;h<x;h++)c[h].face.materialIndex=m}}return c}raycastFirst(e,t=xe,i=0,o=1/0){let a=this._roots,s=this.geometry,c=t.isMaterial,r=Array.isArray(t),d=null,u=s.groups,f=c?t.side:t,l=this.indirect?En:Bn;for(let p=0,w=a.length;p<w;p++){let v=r?t[u[p].materialIndex].side:f,y=l(this,p,v,e,i,o);y!=null&&(d==null||y.distance<d.distance)&&(d=y,r&&(y.face.materialIndex=u[p].materialIndex))}return d}intersectsGeometry(e,t){let i=!1,o=this._roots,a=this.indirect?Nn:_n;for(let s=0,c=o.length;s<c&&(i=a(this,s,e,t),!i);s++);return i}shapecast(e){let t=X.getPrimitive(),i=this.indirect?vn:xn,{boundsTraverseOrder:o,intersectsBounds:a,intersectsRange:s,intersectsTriangle:c}=e;if(s&&c){let f=s;s=(l,p,w,v,y)=>f(l,p,w,v,y)?!0:i(l,p,this,c,w,v,t)}else s||(c?s=(f,l,p,w)=>i(f,l,this,c,p,w,t):s=(f,l,p)=>p);let r=!1,d=0,u=this._roots;for(let f=0,l=u.length;f<l;f++){let p=u[f];if(r=un(this,f,a,s,o,d),r)break;d+=p.byteLength}return X.releasePrimitive(t),r}bvhcast(e,t,i){let{intersectsRanges:o,intersectsTriangles:a}=i,s=X.getPrimitive(),c=this.geometry.index,r=this.geometry.attributes.position,d=this.indirect?w=>{let v=this.resolveTriangleIndex(w);R(s,v*3,c,r)}:w=>{R(s,w*3,c,r)},u=X.getPrimitive(),f=e.geometry.index,l=e.geometry.attributes.position,p=e.indirect?w=>{let v=e.resolveTriangleIndex(w);R(u,v*3,f,l)}:w=>{R(u,w*3,f,l)};if(a){let w=(v,y,m,h,x,g,b,T)=>{for(let A=m,_=m+h;A<_;A++){p(A),u.a.applyMatrix4(t),u.b.applyMatrix4(t),u.c.applyMatrix4(t),u.needsUpdate=!0;for(let B=v,P=v+y;B<P;B++)if(d(B),s.needsUpdate=!0,a(s,u,B,A,x,g,b,T))return!0}return!1};if(o){let v=o;o=function(y,m,h,x,g,b,T,A){return v(y,m,h,x,g,b,T,A)?!0:w(y,m,h,x,g,b,T,A)}}else o=w}return Hn(this,e,t,o)}intersectsBox(e,t){return Ht.set(e.min,e.max,t),Ht.needsUpdate=!0,this.shapecast({intersectsBounds:i=>Ht.intersectsBox(i),intersectsTriangle:i=>Ht.intersectsTriangle(i)})}intersectsSphere(e){return this.shapecast({intersectsBounds:t=>e.intersectsBox(t),intersectsTriangle:t=>t.intersectsSphere(e)})}closestPointToGeometry(e,t,i={},o={},a=0,s=1/0){return(this.indirect?Vn:Dn)(this,e,t,i,o,a,s)}closestPointToPoint(e,t={},i=0,o=1/0){return fn(this,e,t,i,o)}getBoundingBox(e){return e.makeEmpty(),this._roots.forEach(i=>{E(0,new Float32Array(i),Ie),e.union(Ie)}),e}};var xi=parseInt(Fe)>=166;var bi=Ve.prototype.raycast,gi=qe.prototype.raycast;var Xn=`

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`;var On=`

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int ptr = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( ptr > - 1 && ptr < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ ptr ];
		ptr --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			ptr ++;
			stack[ ptr ] = c2;

			ptr ++;
			stack[ ptr ] = c1;

		}

	}

	return found;

}
`;var wi=`
	${Xn}
	${On}
`;export{me as CENTER,he as MeshBVH};
