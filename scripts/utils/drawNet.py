import json
import networkx as nx
import matplotlib.pyplot as plt

# Ruta del archivo JSON
json_file = '../../Datasets/ScaleFree.json'

# Leer los datos del archivo JSON
with open(json_file) as file:
    data = json.load(file)

# Crear un grafo vacío
G = nx.Graph()

# Agregar los nodos y aristas del grafo
for edge in data:
    players = edge["players"]
    weights = edge["weights"]

    if G.has_edge(players[0], players[1]):
        # Si la arista ya existe, agregar el peso al atributo 'weights'
        G[players[0]][players[1]]['weights'].append(weights[0])
    else:
        # Si la arista no existe, crearla con el atributo 'weights'
        G.add_edge(players[0], players[1], weights=[weights[0]])

    if G.has_edge(players[1], players[0]):
        # Si la arista ya existe, agregar el peso al atributo 'weights'
        G[players[1]][players[0]]['weights'].append(weights[1])
    else:
        # Si la arista no existe, crearla con el atributo 'weights'
        G.add_edge(players[1], players[0], weights=[weights[1]])

# Dibujar el grafo
pos = nx.spring_layout(G)
edge_labels = {(u, v): ', '.join(map(str, attr['weights'])) for u, v, attr in G.edges(data=True)}

nx.draw_networkx(G, pos, with_labels=True)
# nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)

plt.show()
