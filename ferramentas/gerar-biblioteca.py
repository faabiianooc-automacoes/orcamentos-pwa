#!/usr/bin/env python3
"""Gera drawio/simbolos-planta.xml: biblioteca do draw.io com símbolos de planta
elétrica residencial (tomadas, interruptores, pontos de luz, quadro etc.).

Uso: python3 ferramentas/gerar-biblioteca.py
Cada símbolo tem um texto editável (circuito, comando, potência) e as cores dos
condutores seguem o padrão do app: terra verde, neutro azul, F1 vermelho,
F2 preto, F3 branco. Para mudar ou acrescentar símbolos, edite SIMBOLOS e rode
de novo. O formato é o de bibliotecas do draw.io (<mxlibrary> com o XML de cada
símbolo comprimido: encodeURIComponent → deflate raw → base64).
"""
import base64, json, os, urllib.parse, zlib
from xml.sax.saxutils import escape, quoteattr

LETRA = 'fontColor=#142029;fontFamily=Helvetica;'
ROT_ABAIXO = 'verticalLabelPosition=bottom;verticalAlign=top;labelPosition=center;align=center;fontSize=10;'


def v(valor, x, y, w, h, estilo):
    return ('vertex', valor, x, y, w, h, estilo)


def linha(x1, y1, x2, y2, estilo, valor=''):
    return ('edge', valor, x1, y1, x2, y2, estilo)


def ponto_texto(rot):  # ponto com sigla dentro
    return f'ellipse;shape=ellipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#142029;strokeWidth=1.5;fontStyle=1;fontSize=9;{LETRA}'


def caixa(cor='#ffffff', extra=''):
    return f'rounded=0;whiteSpace=wrap;html=1;fillColor={cor};strokeColor=#142029;strokeWidth=1.5;fontStyle=1;fontSize=9;{LETRA}{extra}'


def tomada(fill, txt_cor='#142029'):
    return (f'triangle;shape=triangle;direction=north;perimeter=trianglePerimeter;html=1;fillColor={fill};'
            f'strokeColor=#142029;strokeWidth=1.5;{ROT_ABAIXO}{LETRA}')


FIO = 'endArrow=none;html=1;rounded=0;strokeWidth=3;'
SIMBOLOS = [
    # (título, largura, altura, [elementos])
    ('Ponto de luz no teto (edite: circuito, comando, potência)', 44, 44,
     [v('C1<br>a', 0, 0, 44, 44, ponto_texto('') + 'fontSize=10;')]),
    ('Arandela / luz na parede', 36, 22,
     [v('AR', 0, 0, 36, 22, caixa('#ffffff', 'rounded=1;arcSize=50;'))]),
    ('Spot / luminária embutida', 26, 26,
     [v('', 0, 0, 26, 26, ponto_texto('') + 'dashed=1;'), v('', 9, 9, 8, 8, 'ellipse;shape=ellipse;html=1;fillColor=#142029;strokeColor=none;')]),
    ('Interruptor simples (a = comando)', 26, 26, [v('S<br><font style="font-size:7px">a</font>', 0, 0, 26, 26, ponto_texto(''))]),
    ('Interruptor de 2 seções (a, b)', 28, 28, [v('S2<br><font style="font-size:7px">a b</font>', 0, 0, 28, 28, ponto_texto(''))]),
    ('Interruptor paralelo (three-way)', 30, 30, [v('S3W', 0, 0, 30, 30, ponto_texto(''))]),
    ('Interruptor intermediário (four-way)', 30, 30, [v('S4W', 0, 0, 30, 30, ponto_texto(''))]),
    ('Pulsador / minuteria / campainha', 26, 26, [v('P', 0, 0, 26, 26, ponto_texto('') + 'fillColor=#eef2f4;')]),
    ('Dimmer', 28, 28, [v('DIM', 0, 0, 28, 28, ponto_texto(''))]),
    ('Tomada baixa 10 A (30 cm do piso)', 26, 22, [v('C2', 0, 0, 26, 22, tomada('#ffffff'))]),
    ('Tomada média 10 A (1,10 m)', 26, 22, [v('C2', 0, 0, 26, 22, tomada('#9aa3ab'))]),
    ('Tomada alta 10 A (2,00 m)', 26, 22, [v('C2', 0, 0, 26, 22, tomada('#142029'))]),
    ('Tomada 20 A (eletrodomésticos)', 26, 22, [v('C4 · 20A', 0, 0, 26, 22, tomada('#f59e0b'))]),
    ('Tomada dupla baixa', 50, 22, [v('', 0, 0, 24, 22, tomada('#ffffff')), v('C2', 26, 0, 24, 22, tomada('#ffffff') + 'labelPosition=left;align=center;')]),
    ('Tomada de piso', 26, 26, [v('C2', 0, 0, 26, 26, caixa('#ffffff', ROT_ABAIXO)), v('', 4, 6, 18, 15, tomada('#ffffff'))]),
    ('Ponto de força / ar-condicionado', 34, 26, [v('AC', 0, 0, 34, 26, caixa('#e8f1fb'))]),
    ('Chuveiro / aquecedor', 34, 26, [v('CH', 0, 0, 34, 26, caixa('#fdecea'))]),
    ('Motor / bomba', 30, 30, [v('M', 0, 0, 30, 30, ponto_texto('') + 'fontSize=12;')]),
    ('Sensor de presença', 30, 30, [v('SP', 0, 0, 30, 30, ponto_texto('') + 'dashed=1;')]),
    ('Módulo de automação (ESP32, relé inteligente)', 40, 26, [v('AUT', 0, 0, 40, 26, caixa('#d9f2ee', 'rounded=1;'))]),
    ('Sensor (nível, vazamento, porta)', 30, 26, [v('SN', 0, 0, 30, 26, caixa('#d9f2ee', 'rounded=1;dashed=1;'))]),
    ('Quadro de distribuição', 46, 24,
     [v('', 0, 0, 46, 24, caixa()), v('', 0, 0, 23, 24, 'rounded=0;html=1;fillColor=#142029;strokeColor=#142029;'), v('QD', 23, 0, 23, 24, 'text;html=1;fillColor=none;strokeColor=none;fontStyle=1;fontSize=9;align=center;verticalAlign=middle;')]),
    ('Medidor de energia', 30, 30, [v('kWh', 0, 0, 30, 30, caixa())]),
    ('Caixa de passagem', 22, 22, [v('', 0, 0, 22, 22, caixa()), linha(0, 0, 22, 22, 'endArrow=none;html=1;strokeColor=#142029;'), linha(22, 0, 0, 22, 'endArrow=none;html=1;strokeColor=#142029;')]),
    ('Eletroduto no teto ou parede', 120, 10, [linha(0, 5, 120, 5, 'endArrow=none;html=1;rounded=0;strokeWidth=2;strokeColor=#142029;')]),
    ('Eletroduto no piso', 120, 10, [linha(0, 5, 120, 5, 'endArrow=none;html=1;rounded=0;strokeWidth=2;strokeColor=#142029;dashed=1;dashPattern=8 4;')]),
    ('Condutor terra (PE) - verde', 80, 10, [linha(0, 5, 80, 5, FIO + 'strokeColor=#2e9e3e;')]),
    ('Condutor neutro - azul', 80, 10, [linha(0, 5, 80, 5, FIO + 'strokeColor=#1565c0;')]),
    ('Condutor fase 1 - vermelho', 80, 10, [linha(0, 5, 80, 5, FIO + 'strokeColor=#d71920;')]),
    ('Condutor fase 2 - preto', 80, 10, [linha(0, 5, 80, 5, FIO + 'strokeColor=#111111;')]),
    ('Condutor fase 3 - branco', 80, 10, [linha(0, 5, 80, 5, 'endArrow=none;html=1;rounded=0;strokeWidth=5;strokeColor=#4a4f55;'), linha(0, 5, 80, 5, FIO + 'strokeColor=#ffffff;')]),
    ('Condutor de retorno - amarelo', 80, 10, [linha(0, 5, 80, 5, FIO + 'strokeColor=#f2c200;')]),
    ('Legenda', 230, 215, [v(
        '<b>LEGENDA</b><br>'
        '△ branco: tomada baixa (30 cm) · cinza: média (1,10 m) · preto: alta (2,00 m) · laranja: 20 A<br>'
        '○ com texto: ponto de luz no teto (circuito e comando)<br>'
        'S, S2, S3W, S4W: interruptores simples, 2 seções, paralelo, intermediário<br>'
        'P: pulsador · DIM: dimmer · SP: sensor de presença<br>'
        'AC: ar-condicionado · CH: chuveiro · M: motor/bomba<br>'
        'AUT: módulo de automação · SN: sensor · QD: quadro · kWh: medidor<br>'
        'Eletroduto: contínuo = teto/parede · tracejado = piso<br>'
        '<font color="#2e9e3e">■</font> terra · <font color="#1565c0">■</font> neutro · <font color="#d71920">■</font> fase 1 · ■ fase 2 · □ fase 3 · <font color="#f2c200">■</font> retorno',
        0, 0, 230, 215, 'text;html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#142029;align=left;verticalAlign=top;spacing=8;fontSize=10;' + LETRA)]),
]


def celulas(elems):
    out, i = [], 2
    for e in elems:
        tipo, valor, a, b, c, d, estilo = e
        if tipo == 'vertex':
            out.append(f'<mxCell id="{i}" value={quoteattr(valor)} style={quoteattr(estilo)} vertex="1" parent="1">'
                       f'<mxGeometry x="{a}" y="{b}" width="{c}" height="{d}" as="geometry"/></mxCell>')
        else:
            out.append(f'<mxCell id="{i}" value={quoteattr(valor)} style={quoteattr(estilo)} edge="1" parent="1">'
                       f'<mxGeometry relative="1" as="geometry"><mxPoint x="{a}" y="{b}" as="sourcePoint"/>'
                       f'<mxPoint x="{c}" y="{d}" as="targetPoint"/></mxGeometry></mxCell>')
        i += 1
    return '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' + ''.join(out) + '</root></mxGraphModel>'


def comprimir(xml):
    # Igual ao Graph.compress do draw.io: encodeURIComponent → deflate raw → base64
    dados = urllib.parse.quote(xml, safe="~()*!.'-_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789").encode()
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return base64.b64encode(c.compress(dados) + c.flush()).decode()


def main():
    entradas = [{'xml': comprimir(celulas(el)), 'w': w, 'h': h, 'aspect': 'fixed', 'title': t} for t, w, h, el in SIMBOLOS]
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    destino = os.path.join(raiz, 'drawio', 'simbolos-planta.xml')
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, 'w', encoding='utf-8') as f:
        f.write('<mxlibrary>' + json.dumps(entradas, ensure_ascii=False) + '</mxlibrary>')
    print(f'{len(entradas)} símbolos → {destino}')


if __name__ == '__main__':
    main()
