/* script.js - Lógica Financeira e Tributária (Atualizado LCP 224 + Lucro Real) */

function parseMoney(valor) {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'string') {
        valor = valor.trim();
        if (valor.includes(',')) {
            valor = valor.replace(/\./g, '').replace(',', '.');
        }
    }
    const numero = parseFloat(valor);
    return isNaN(numero) ? 0 : numero;
}

function calcular() {
    // 1. Captura de Inputs
    const regime = document.getElementById('regime').value;
    const receitaAnual = parseMoney(document.getElementById('receitaAnual').value);
    const receitaMes = parseMoney(document.getElementById('receitaMes').value);
    const unidades = parseMoney(document.getElementById('unidades').value);
    
    // Inputs Específicos
    const isMCMV = document.getElementById('isMCMV') ? document.getElementById('isMCMV').checked : false;
    const margemLucroInput = parseMoney(document.getElementById('margemLucro').value);
    const tipoPisCofins = document.getElementById('tipoPisCofins') ? document.getElementById('tipoPisCofins').value : 'cumulativo';
    const checkBets = document.getElementById('checkBets').checked;

    // Validações
    if (!checkBets) {
        alert("ALERTA DE COMPLIANCE:\n\nÉ obrigatório confirmar a cláusula de barreira sobre publicidade de apostas (LCP 224 Art. 6º).");
        return;
    }
    if (receitaMes <= 0) {
        alert("Insira um Faturamento do Mês válido.");
        return;
    }

    let impostoTotal = 0;
    let aliquotaFinal = 0;
    let alertaLCP224 = false;

    // --- CÁLCULO POR REGIME ---

    // 1. RET (Incorporação)
    if (regime === 'ret') {
        let aliquotaBase = isMCMV ? 0.01 : 0.04;
        impostoTotal = receitaMes * aliquotaBase;
        aliquotaFinal = aliquotaBase;
    } 
    
    // 2. LUCRO REAL (Construtora Grande Porte)
    else if (regime === 'lucro_real') {
        if (margemLucroInput <= 0) {
            alert("Para Lucro Real, informe a Margem de Lucro Estimada (%).");
            return;
        }

        // A. PIS/COFINS (Base é o Faturamento)
        let taxaPisCofins = 0;
        if (tipoPisCofins === 'cumulativo') {
            taxaPisCofins = 0.0365; // 3.65% (Obra Civil Pura)
        } else {
            taxaPisCofins = 0.0925; // 9.25% (Não-Cumulativo)
        }
        let valPisCofins = receitaMes * taxaPisCofins;

        // B. IRPJ e CSLL (Base é o LUCRO REAL APURADO)
        // Transformar margem % em valor monetário
        let lucroFiscal = receitaMes * (margemLucroInput / 100);

        // IRPJ: 15% Base + 10% Adicional sobre excedente de 20k
        let valIRPJ = lucroFiscal * 0.15;
        if (lucroFiscal > 20000) {
            valIRPJ += (lucroFiscal - 20000) * 0.10;
        }

        // CSLL: 9% (Regra Geral - LCP 224 alterou apenas financeiras/seguros) [cite: 251]
        let valCSLL = lucroFiscal * 0.09;

        impostoTotal = valPisCofins + valIRPJ + valCSLL;
        aliquotaFinal = impostoTotal / receitaMes;

        // Nota: Lucro Real não sofre a "Trava de Presunção" da LCP 224, pois não usa presunção.
        alertaLCP224 = false; 
    }

    // 3. LUCRO PRESUMIDO (Padrão)
    else {
        let presuncaoIRPJ = 0.08; 
        let presuncaoCSLL = 0.12;
        const aliquotaPIS = 0.0065;
        const aliquotaCOFINS = 0.03;

        // GATILHO LCP 224 (Apenas Presumido): Receita Anual > 5 Milhões
        // Art. 4º, § 5º 
        if (receitaAnual > 5000000) {
            alertaLCP224 = true;
            presuncaoIRPJ = presuncaoIRPJ * 1.10; // +10% na presunção
            presuncaoCSLL = presuncaoCSLL * 1.10; 
        }

        let valPis = receitaMes * aliquotaPIS;
        let valCofins = receitaMes * aliquotaCOFINS;

        let baseCalcIRPJ = receitaMes * presuncaoIRPJ;
        let valIRPJ = baseCalcIRPJ * 0.15;
        if (baseCalcIRPJ > 20000) {
            valIRPJ += (baseCalcIRPJ - 20000) * 0.10;
        }

        let baseCalcCSLL = receitaMes * presuncaoCSLL;
        let valCSLL = baseCalcCSLL * 0.09;

        impostoTotal = valPis + valCofins + valIRPJ + valCSLL;
        aliquotaFinal = impostoTotal / receitaMes;
    }

    // 3. Salvar Dados
    const resultado = {
        valor: impostoTotal,
        aliquota: (aliquotaFinal * 100).toFixed(2),
        alerta: alertaLCP224,
        regime: regime, // Salvei o regime para exibir mensagem personalizada no resultado
        temVenda: unidades > 0
    };

    localStorage.setItem('dadosCalculo', JSON.stringify(resultado));
    window.location.href = 'resultado.html';
}

function carregarResultados() {
    const dadosString = localStorage.getItem('dadosCalculo');
    if (!dadosString) return;

    const dados = JSON.parse(dadosString);
    const valorFormatado = dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const elValor = document.getElementById('valorImposto');
    const elAliquota = document.getElementById('aliquotaEfetiva');
    const elAlertBox = document.getElementById('alertBox');
    
    if (elValor) elValor.innerText = valorFormatado;
    if (elAliquota) elAliquota.innerText = dados.aliquota + "%";

    // Exibir Alerta LCP 224 (Apenas se for Presumido e estourar o teto)
    if (dados.alerta && elAlertBox) {
        elAlertBox.style.display = 'block';
    } else if (elAlertBox) {
        elAlertBox.style.display = 'none';
    }

    // Compliance Messages
    const elMsgDimob = document.getElementById('msgDimob');
    const elMsgCib = document.getElementById('msgCib');
    
    if (dados.temVenda) {
        if(elMsgDimob) {
            elMsgDimob.innerHTML = "<strong>CRÍTICO:</strong> Venda detectada. Declarar na competência atual.";
            elMsgDimob.style.color = "#8a1c1c";
        }
        if(elMsgCib) {
            elMsgCib.innerHTML = "<strong>PENDENTE:</strong> Vincular matrícula da unidade ao CIB.";
            elMsgCib.style.color = "#8a1c1c";
        }
    } else {
        if(elMsgDimob) elMsgDimob.innerText = "Sem movimentação de venda.";
        if(elMsgCib) elMsgCib.innerText = "Regular.";
    }
}