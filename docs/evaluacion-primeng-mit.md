# Evaluación de PrimeNG MIT y Angular 22

Fecha: 10 de noviembre de 2026.

## Resultado

No se recomienda bajar PrimeNG a la línea 21 manteniendo Angular 22: la versión 21.1.10 conserva MIT para su distribución Community, pero sus `peerDependencies` publicadas excluyen Angular 22. Esta evaluación no modifica dependencias ni aplica una migración.

## Estado del proyecto

Versiones resueltas en [package-lock.json](../package-lock.json), contrastadas con los paquetes instalados:

| Paquete | Versión | Licencia / compatibilidad |
| --- | --- | --- |
| Angular core | 22.2.0 | MIT |
| Angular CDK | 22.2.0 | MIT; dependencia peer de PrimeNG |
| PrimeNG | 22.1.2 | PrimeUI; peers Angular `^22.1.0` |
| @primeuix/themes | 3.0.1 | PrimeUI |
| primeicons | 8.0.2 | PrimeUI |

Los tres últimos paquetes declaran `SEE LICENSE IN LICENSE.md`; se revisaron sus archivos de licencia instalados. No debe interpretarse ese campo como MIT. PrimeNG 22 incorpora además `@primeui/license-manager`.

PrimeUI permite una licencia Community gratuita para usuarios elegibles, con clave y renovación anual. No equivale a MIT. No se ha determinado la elegibilidad de la organización. El anuncio oficial establece que el cambio comienza en PrimeNG 22 y que las versiones previamente publicadas bajo MIT conservan esa licencia.

## Candidata anterior: PrimeNG 21.1.10

La consulta `npm.cmd view primeng@21 version license peerDependencies dependencies --json` devuelve 21.1.10 como la versión más reciente de la línea 21 disponible en la fecha de evaluación. Su licencia distingue Community MIT y versiones comerciales con sufijo `-lts`.

Sus requisitos publicados son:

| Dependencia peer | Rango |
| --- | --- |
| @angular/core | ^21.0.7 |
| @angular/common, forms, router, platform-browser, cdk | ^21.0.0 |
| rxjs | ^6.0.0 \|\| ^7.8.1 |

Angular 22.2.0 queda fuera de esos rangos: la comprobación con `semver.satisfies('22.2.0', '^21.0.7')` devuelve `false`. Por tanto, la combinación no tiene compatibilidad declarada por el paquete. Esto no prueba que cada componente falle en ejecución, pero impide recomendarla como una migración compatible y soportada. No se utilizó `--force`, `--legacy-peer-deps` ni overrides para ocultar el conflicto.

PrimeNG 21.1.10 utiliza además las líneas anteriores de PrimeUIX: styled `^0.7.4`, styles `^2.0.3`, motion `^0.0.10` y utils `^0.7.2`. Bajar solo PrimeNG y conservar themes 3.0.1 e iconos 8.0.2 tampoco cumpliría el objetivo de retirar las dependencias PrimeUI actuales.

## Impacto y opciones

El proyecto importa componentes en expedientes, catálogos, usuarios, roles, plantillas, validación y componentes compartidos. Utiliza Select, DatePicker, ToggleSwitch, Drawer, Table, Dialog, AutoComplete y otros. [app.config.ts](../src/app/app.config.ts) configura `providePrimeNG`, Aura y un preset personalizado con `definePreset`; una sustitución debe revisar también tema y estilos.

1. **Conservar Angular 22 y exigir MIT:** evaluar por separado una biblioteca o fork con licencia MIT y peers que admitan explícitamente Angular 22. Validar mantenimiento, dependencias transitivas, equivalencia de componentes y accesibilidad antes de migrar. Esta evaluación no certifica ninguna alternativa.
2. **Usar PrimeNG 21 MIT:** requiere evaluar conjuntamente el descenso de Angular, CLI, build, compiler, CDK y TypeScript a versiones compatibles con Angular 21, además de seleccionar temas e iconos con licencias verificadas. Fijar versiones y conservar los avisos MIT. Es un cambio más amplio y no satisface el requisito de conservar Angular 22.
3. **Conservar PrimeNG 22:** mantiene la compatibilidad actual con Angular, bajo los términos PrimeUI Community o Commercial aplicables; no satisface un requisito estricto de MIT.

Recomendación: si Angular 22 y MIT son requisitos obligatorios, descartar el downgrade directo a PrimeNG 21 y evaluar una sustitución compatible. Las páginas históricas de LTS que afirman que toda versión sin sufijo `-lts` es MIT no describen el nuevo régimen de PrimeNG 22.

## Validación realizada y límites

- Inspección de manifiesto, lockfile, licencias instaladas, imports y configuración del tema.
- Consulta de todas las versiones 21 publicadas y sus peers en npm.
- Verificación del texto de licencia del tag 21.1.10 y del anuncio oficial de PrimeUI.
- `npm.cmd run build`: correcto con las dependencias actuales; diez advertencias existentes por presupuestos de estilos SCSS. Este resultado solo valida la compilación actual con PrimeNG 22.
- No se instaló PrimeNG 21 ni se ejecutaron pruebas funcionales de esa combinación: el conflicto de peers ya descarta su compatibilidad declarada con Angular 22. No se afirma compatibilidad experimental.

## Fuentes y reproducción

- [Anuncio oficial: cambio de licencia desde PrimeNG 22](https://primeui.dev/nextchapter).
- [Licencia del tag 21.1.10: Community MIT y LTS](https://github.com/primefaces/primeng/blob/21.1.10/LICENSE.md).
- [Metadatos publicados de PrimeNG 21.1.10](https://registry.npmjs.org/primeng/21.1.10).
- [Repositorio de las versiones MIT y estado de mantenimiento](https://github.com/primefaces/primeng): declara continuidad de correcciones de seguridad, sin desarrollo activo de nuevas funcionalidades.

```powershell
npm.cmd view primeng@21 version license peerDependencies dependencies --json
npm.cmd view primeng@21.1.10 peerDependencies --json
npm.cmd run build
```
