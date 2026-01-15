## PLAN

    bir poster hazırlncak koyu tonda estetik kaygıları olan bir düzlem hazırlancak. bu yıldız haritasında takımyıldızları
arasındaki bağlantılar da olacak. takımyıldızlarının yanında adları ve kaç yılında bulundukları yazacak

1) Yıldızların noktalarını sapta
- koordinat al
- ypıştırabilir bilgiye dönüştür
- takımyılıdızı ne zaman, kimin tarafından
- tkımyıldızlrı bilgisi ekle (ve takım yıldızlrında hngilerinin bağlantılı olduğu, arlarında çzigi olanlar)
- nokta oluştur düzlemde
- noktalar arasında belirlenen yıldızlrın arasındagi çizgiyi kur

99) EKLENECEKELER
- takım yıldızlarının yanına adlarını ve bulunduklrı yılı yaz
- takımyıldızının vrsa eğer bir hikayesi küçük bir şekilde yazılcak yanına 

## AI ICIN VERILEBILECEK CONTEXT

[SYSTEM_CONTEXT]
Role: You are an expert "Creative Technologist" and "Thought Partner" acting as a co-pilot for a user working in the Windsurf IDE. You speak Turkish with the user but generate code/technical prompts in English for better accuracy.

Project Name: "Uygarlığın Başlangıcı" (The Beginning of Civilization)
Project Goal: Create a highly aesthetic, dark-themed, scientific Star Map Poster using code.

Tech Stack:
- IDE: Windsurf (using its "Flow" or "Cascade" agent capabilities)
- Core: JavaScript, p5.js, HTML5 Canvas
- Data: JSON (for stars and constellations)
- Output: High-resolution rendering for print.

The Master Plan (User's README):
The project is divided into phases based on the user's roadmap:

PHASE 1 (CURRENT FOCUS): Geometry & Rendering
- Detect star points (Coordinates: RA/Dec -> Convert to X/Y using Stereographic Projection).
- Render stars as glowing orbs (not just pixels) based on Magnitude.
- Draw constellation lines (thin, elegant, semi-transparent).
- Set up a deep, dark aesthetic background.
- Implement Zoom/Pan for navigation.

PHASE 99 (FUTURE): Metadata & Typography
- Add names of constellations.
- Add "Year of Discovery" and "Origin" (e.g., Ptolemy).
- Add mythological stories (short text) next to the constellations.
- Advanced typography placement.

Current Status:
We are currently generating the "Master Prompts" to feed into Windsurf to build Phase 1. We have defined the data structure to support Phase 99 (including fields for stories/years) even if we don't render them yet.

Interaction Guidelines:
1. Always guide the user with structured plans (Step 1, Step 2...).
2. Provide specific "Prompt Blocks" in English that the user can copy-paste directly into Windsurf.
3. Keep the tone helpful, encouraging ("Kral" vibe), and technically precise.
4. Do not move to Phase 99 until Phase 1 is perfect.

## PLAN 2

1) hoverlandığınında constellationlar gözüksün.
- hepsi her zaman gözükçek mi ayarı.
- constellationların ismi yazacak
-> şuan yazan şeyler ne tam emin değilim, kısaltma olabilir
- çirkin gözükmesin (içi dolu çokgenler istemiyoruz) sadece aradaki çizgilerin gözükmesi yeterli
-- Windsurf ide için hazırlanan bütün promptlarda şu ana kadar projede gelinen nokta bunu geri okuyacak olan sen (external tavsiye aldığım ai) için betimleyici olsun ki projeyi takip edebil

2) 
- şu ana kadar gelinen noktada optionsdan açılan Star Names'te hangi yıldızların gözüktüğüne emin değilim. hepsini göstermesi imkansız. Bari sadece gösterilen takımyıldızlarındaki yıldızların adı gözüksün.

99) 
- hikayesi ve bulunduğu yıl yazılsın
- estetik kaygılar

999) projeyi klonlayıp bir de next.js ile webde çalışan halini yap, lokalde çalışabilen halini yaptıktan sonra

## SONRAKİ AŞAMA

PLAN 2.2 sonrası yorumu (PLAN-2.2.Y):

- adı gösterilen yıldızlardan emin değilim
-> hangi yıldızların adı gözükmeli?
- bazı takımyıldızlarını adı yanlış yerlerde
-> dinamik olarak yer değiştirecek olan yıldızların konumunun ortalaması alınıp onların ortalama noktası nere ise orada yazmalı ad
--> bunun için bu alanda tercih edilen başka bir uygulama var mı? var ise ve projemize uygulanabiliyor ise onu kullanalım
--> şuan baktığımda ad textlerinin yanlış gözüktüğü takımyıldızları: Ursa Major, Formax, Virgo (belki daha benim gözlemlemediğim takımyıldızlarında da vardır)
--->sıkıntı sadece belli başlı takımyıldızları için mi yoksa ad textini koyduğumuz yeri ayarlayan sistem tam oturmamış mı?
- eğer takımyıldızlarını hep göster özelliği açık değilse: gösterilen takımyıldızlarından bir tanesinin içerdiği yıldız üzerine gelindi ise bu takımyıldızının adını göster sadece
-> gösterilmesi tercih edilen takımyıldızları niye seçilmiş?
--> niye sadece onlar gösterilyor? bu işin bir standardı mı var? kral? readme işine yarayacak kadar güncellenmiş mi? bunu yapması gerektiğini belirttin di mi?

## Projenin hikayesi:

This project was made for a friend to honor his deceased pet's memory. His request was to have a poster of a star map on the day he found his pet. His overromantacised request only solution i (gemini) could find (maybe there is another service like this idk) on the internet was €70 - €80. Because that we do not excrete money i took this request as a challenge to see if i could do it in a session where i was feeling a bit medicated.

## PLAN-2.2.Y.Y

...