export const BREEDS=Object.freeze([
 {index:0,id:'domestic',name:'기본 단모 고양이',from:1,color:0xe8b76c,eye:0x875843,earW:.57,earH:.38,pattern:'tabby',fluff:0,description:'치즈빛 줄무늬와 친숙한 얼굴'},
 {index:1,id:'american',name:'아메리칸 쇼트헤어',from:5,color:0xb4beca,eye:0x84a779,earW:.55,earH:.40,pattern:'silver-tabby',fluff:0,description:'은색 몸과 또렷한 고등어 줄무늬'},
 {index:2,id:'british',name:'브리티시 쇼트헤어',from:10,color:0x849eaf,eye:0xd49b49,earW:.62,earH:.29,pattern:'solid',fluff:.12,description:'통통한 볼과 둥근 귀, 호박빛 눈'},
 {index:3,id:'siamese',name:'샴',from:15,color:0xf3dfbd,eye:0x69bde0,point:0x685343,earW:.61,earH:.63,pattern:'point',fluff:0,description:'크림색 몸, 짙은 얼굴과 큰 귀'},
 {index:4,id:'persian',name:'페르시안',from:20,color:0xf0e5d5,eye:0x99bba4,earW:.51,earH:.28,pattern:'longhair',fluff:.30,description:'풍성한 장모와 둥글고 짧은 코'},
 {index:5,id:'ragdoll',name:'랙돌',from:25,color:0xf6eadd,eye:0x6cadd9,point:0x9a7663,earW:.58,earH:.43,pattern:'bicolor',fluff:.22,description:'하얀 역 V 얼굴과 파란 눈, 부드러운 털'},
 {index:6,id:'maine-coon',name:'메인쿤',from:30,color:0xc69b71,eye:0xa7b375,point:0x806450,earW:.62,earH:.58,pattern:'tufted-tabby',fluff:.25,description:'귀 끝의 털과 풍성한 갈기·꼬리'}
]);
export function breedAtIndex(value){const n=Number(value);return BREEDS[Math.max(0,Math.min(6,Number.isFinite(n)?Math.floor(n):0))];}
export function breedForFloor(value){const n=Math.max(0,Number(value)||0);return [...BREEDS].reverse().find(b=>n>=b.from)||BREEDS[0];}
export function nextBreed(value){const n=Number(value)||0;return BREEDS.find(b=>b.from>n)||null;}
